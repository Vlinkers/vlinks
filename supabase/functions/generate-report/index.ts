import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vin_id } = await req.json();

    if (!vin_id) {
      return new Response(JSON.stringify({ error: 'vin_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        requires_auth: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's auth
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        requires_auth: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating report for VIN ${vin_id}, user ${user.id}`);

    // Fetch VIN details
    const { data: vinRecord, error: vinError } = await supabase
      .from('vins')
      .select('*')
      .eq('id', vin_id)
      .single();

    if (vinError || !vinRecord) {
      return new Response(JSON.stringify({ error: 'VIN not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all publishable contributions for this VIN
    const { data: contributions, error: contribError } = await supabase
      .from('public_contributions')
      .select(`
        id,
        contribution_type,
        summary_public,
        technical_findings,
        risk_level,
        confidence_source,
        source_credibility,
        is_owner_contribution,
        intervention_type,
        intervention_date,
        mileage_at_intervention,
        created_at,
        author_label,
        key_facts,
        mechanic_signals,
        risk_indicators,
        document_analysis,
        document_vs_oral_gap,
        confidence_level,
        has_document_attached
      `)
      .eq('vin_id', vin_id)
      .eq('publishable', true)
      .order('created_at', { ascending: false });

    if (contribError) {
      console.error('Error fetching contributions:', contribError);
      throw contribError;
    }

    // Aggregate all data
    const allKeyFacts: string[] = [];
    const allMechanicSignals: string[] = [];
    const allRiskIndicators: string[] = [];
    const allTechnicalFindings: string[] = [];
    const documentAnalyses: string[] = [];
    const oralVsDocGaps: string[] = [];
    let totalRiskLevel = 0;
    let highestRiskLevel = 1;
    let hasHighConfidence = false;

    contributions?.forEach(c => {
      if (c.key_facts) allKeyFacts.push(...c.key_facts);
      if (c.mechanic_signals) allMechanicSignals.push(...c.mechanic_signals);
      if (c.risk_indicators) allRiskIndicators.push(...c.risk_indicators);
      if (c.technical_findings) allTechnicalFindings.push(...c.technical_findings);
      if (c.document_analysis) documentAnalyses.push(c.document_analysis);
      if (c.document_vs_oral_gap) oralVsDocGaps.push(c.document_vs_oral_gap);
      
      const risk = c.risk_level || 1;
      totalRiskLevel += risk;
      if (risk > highestRiskLevel) highestRiskLevel = risk;
      if (c.confidence_level === 'high') hasHighConfidence = true;
    });

    const averageRiskLevel = contributions && contributions.length > 0
      ? Math.round((totalRiskLevel / contributions.length) * 10) / 10
      : 0;

    // Generate recommendation
    let recommendation = '';
    if (highestRiskLevel >= 4) {
      recommendation = 'ATTENTION REQUISE : Des problèmes significatifs ont été signalés. Une inspection professionnelle approfondie est fortement recommandée avant tout achat.';
    } else if (highestRiskLevel === 3 || allMechanicSignals.length > 3) {
      recommendation = 'PRUDENCE : Quelques points d\'attention ont été relevés. Une vérification des éléments mentionnés est conseillée.';
    } else if (contributions && contributions.length >= 2 && hasHighConfidence) {
      recommendation = 'CONFIANCE MODÉRÉE : Les contributions disponibles ne révèlent pas de problème majeur. Le véhicule semble en bon état selon les témoignages.';
    } else if (contributions && contributions.length > 0) {
      recommendation = 'INFORMATIONS LIMITÉES : Peu de contributions disponibles. Des vérifications supplémentaires sont recommandées.';
    } else {
      recommendation = 'AUCUNE DONNÉE : Aucune contribution n\'est disponible pour ce véhicule.';
    }

    // Build report
    const report = {
      generated_at: new Date().toISOString(),
      vin: vinRecord.vin,
      vehicle: {
        make: vinRecord.make,
        model: vinRecord.model,
        year: vinRecord.year,
      },
      summary: {
        total_contributions: contributions?.length || 0,
        unique_contributors: new Set(contributions?.filter(c => c.author_label !== 'Anonyme').map(c => c.author_label)).size,
        average_risk_level: averageRiskLevel,
        highest_risk_level: highestRiskLevel,
        trust_score: vinRecord.trust_score || 0,
        has_high_confidence_source: hasHighConfidence,
        has_owner_contributions: contributions?.some(c => c.is_owner_contribution) || false,
        has_document_analysis: documentAnalyses.length > 0,
      },
      recommendation,
      key_facts: [...new Set(allKeyFacts)],
      mechanic_signals: [...new Set(allMechanicSignals)],
      risk_indicators: [...new Set(allRiskIndicators)],
      technical_findings: [...new Set(allTechnicalFindings)],
      document_analyses: documentAnalyses,
      oral_vs_document_gaps: oralVsDocGaps,
      contributions: contributions?.map(c => ({
        id: c.id,
        type: c.contribution_type,
        date: c.created_at,
        author: c.author_label,
        summary: c.summary_public,
        risk_level: c.risk_level,
        confidence_level: c.confidence_level,
        confidence_source: c.confidence_source,
        is_owner_contribution: c.is_owner_contribution,
        intervention_type: c.intervention_type,
        intervention_date: c.intervention_date,
        mileage: c.mileage_at_intervention,
        has_document: c.has_document_attached,
      })) || [],
    };

    console.log(`Report generated: ${contributions?.length || 0} contributions, risk ${averageRiskLevel}`);

    return new Response(JSON.stringify({ 
      success: true,
      report 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
