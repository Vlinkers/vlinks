import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse de contributions concernant des véhicules d'occasion.

Ton rôle est de transformer des contributions brutes (rapports d'inspection, observations, échanges) en résumés factuels, neutres et publiables.

RÈGLES STRICTES :
1. Aucun langage émotionnel ou subjectif
2. Aucun nom de personne, d'entreprise, de garage ou de concessionnaire - JAMAIS de noms propres
3. Aucune accusation directe ou diffamatoire
4. Reformulation factuelle uniquement
5. Extraire les constats techniques objectifs
6. Si le contenu est juridiquement risqué ou diffamatoire → publishable = false

Tu dois produire UNIQUEMENT un JSON valide avec ce format exact :
{
  "summary_public": "Résumé factuel et neutre de la contribution (max 300 caractères)",
  "technical_findings": ["constat technique 1", "constat technique 2", ...],
  "risk_level": <nombre de 1 à 5>,
  "confidence_source": "<inspection professionnelle | observation personnelle | historique véhicule | échange avec propriétaire | échange avec mécanicien>",
  "source_credibility": "Description du niveau de crédibilité de la source (voir règles ci-dessous)",
  "publishable": <true | false>
}

RÈGLES POUR source_credibility :
- Ne JAMAIS citer de nom de garage, marque, concessionnaire ou entreprise
- Qualifier la source selon ces catégories :
  * "réseau constructeur" → "Inspection de niveau constructeur, réalisée selon les standards du fabricant."
  * "garage certifié" → "Inspection effectuée par un garage certifié selon les normes professionnelles."
  * "inspection indépendante" → "Inspection réalisée par un professionnel indépendant."
  * "observation propriétaire" → "Observations rapportées par un propriétaire du véhicule."
  * "échange verbal" → "Informations recueillies lors d'un échange avec un intervenant."
- La phrase doit toujours être neutre, factuelle et sans mention de noms propres

Échelle de risque :
1 = Aucun problème détecté
2 = Problèmes mineurs (usure normale)
3 = Problèmes modérés nécessitant attention
4 = Problèmes significatifs
5 = Problèmes critiques de sécurité ou fraude suspectée

Si le contenu est vide, incompréhensible ou ne contient aucune information utile sur le véhicule, retourne :
{
  "summary_public": "",
  "technical_findings": [],
  "risk_level": 1,
  "confidence_source": "observation personnelle",
  "source_credibility": "Source non qualifiable.",
  "publishable": false
}`;

interface RawContribution {
  id: string;
  user_id: string;
  vin_id: string;
  contribution_type: string;
  title: string;
  summary: string | null;
  details: string | null;
  is_anonymous: boolean;
}

interface AIResponse {
  summary_public: string;
  technical_findings: string[];
  risk_level: number;
  confidence_source: string;
  source_credibility: string;
  publishable: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contribution_id } = await req.json();

    if (!contribution_id) {
      throw new Error('contribution_id is required');
    }

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing');
    }

    console.log(`Processing contribution: ${contribution_id}`);

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch raw contribution
    const { data: rawContribution, error: fetchError } = await supabase
      .from('raw_contributions')
      .select('*')
      .eq('id', contribution_id)
      .single();

    if (fetchError || !rawContribution) {
      console.error('Error fetching raw contribution:', fetchError);
      throw new Error(`Contribution not found: ${contribution_id}`);
    }

    console.log(`Found contribution: ${rawContribution.title}`);

    // Update status to processing
    await supabase
      .from('raw_contributions')
      .update({ processing_status: 'processing' })
      .eq('id', contribution_id);

    // Build content for AI analysis
    const contentToAnalyze = `
Type de contribution : ${rawContribution.contribution_type}
Titre : ${rawContribution.title}
Résumé : ${rawContribution.summary || 'Non fourni'}
Détails : ${rawContribution.details || 'Non fournis'}
    `.trim();

    console.log('Calling OpenAI API...');

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: contentToAnalyze }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      
      // Update status to failed
      await supabase
        .from('raw_contributions')
        .update({ 
          processing_status: 'failed',
          processing_error: `OpenAI API error: ${openAIResponse.status}`
        })
        .eq('id', contribution_id);

      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const aiData = await openAIResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received:', aiContent);

    // Parse AI response
    let aiResult: AIResponse;
    try {
      aiResult = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      await supabase
        .from('raw_contributions')
        .update({ 
          processing_status: 'failed',
          processing_error: 'Failed to parse AI response'
        })
        .eq('id', contribution_id);

      throw new Error('Failed to parse AI response');
    }

    // Validate AI response structure
    if (typeof aiResult.summary_public !== 'string' ||
        !Array.isArray(aiResult.technical_findings) ||
        typeof aiResult.risk_level !== 'number' ||
        typeof aiResult.confidence_source !== 'string' ||
        typeof aiResult.source_credibility !== 'string' ||
        typeof aiResult.publishable !== 'boolean') {
      throw new Error('Invalid AI response structure');
    }

    // Clamp risk_level to 1-5
    aiResult.risk_level = Math.min(5, Math.max(1, aiResult.risk_level));

    console.log('Creating public contribution...');

    // Insert into public_contributions
    const { data: publicContribution, error: insertError } = await supabase
      .from('public_contributions')
      .insert({
        raw_contribution_id: contribution_id,
        user_id: rawContribution.user_id,
        vin_id: rawContribution.vin_id,
        contribution_type: rawContribution.contribution_type,
        summary_public: aiResult.summary_public,
        technical_findings: aiResult.technical_findings,
        risk_level: aiResult.risk_level,
        confidence_source: aiResult.confidence_source,
        source_credibility: aiResult.source_credibility,
        is_anonymous: rawContribution.is_anonymous,
        publishable: aiResult.publishable,
        ai_model_used: 'gpt-4.1-2025-04-14'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting public contribution:', insertError);
      
      await supabase
        .from('raw_contributions')
        .update({ 
          processing_status: 'failed',
          processing_error: insertError.message
        })
        .eq('id', contribution_id);

      throw new Error(`Failed to create public contribution: ${insertError.message}`);
    }

    // Update raw contribution status to completed
    await supabase
      .from('raw_contributions')
      .update({ processing_status: 'completed' })
      .eq('id', contribution_id);

    console.log(`Contribution processed successfully: ${publicContribution.id}`);

    return new Response(JSON.stringify({ 
      success: true,
      public_contribution_id: publicContribution.id,
      publishable: aiResult.publishable
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-contribution:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
