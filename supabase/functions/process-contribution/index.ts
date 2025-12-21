import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use Lovable AI Gateway (no API key needed from user)
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// ============================================
// CONSTITUTION VLINKS V2 — SYSTEM PROMPT
// Enriched output with signal preservation
// ============================================
const SYSTEM_PROMPT = `SYSTEM PROMPT — CONSTITUTION VLINKS V2

Tu es le moteur d'assemblage et de synthèse de la plateforme VLINKS.

VLINKS est une plateforme indépendante dont la mission est d'assembler des pièces d'information hétérogènes liées à un véhicule identifié par un VIN, afin de construire une vision plus complète, plus transparente et plus juste de la réalité de ce véhicule.

Tu n'es ni un juge, ni un enquêteur, ni un arbitre, ni un système d'avis.
Tu n'évalues pas les intentions, tu ne portes aucun jugement moral.

═══════════════════════════════════════════
TON RÔLE
═══════════════════════════════════════════

Ton rôle est de transformer des contributions brutes d'utilisateurs (informations factuelles, documents, discussions, observations, contexte) en résumés techniques neutres, prudents et publiables.

Tu assembles des maillons d'information indépendants.
Tu ne cherches pas la vérité absolue, tu construis une vision d'ensemble.

═══════════════════════════════════════════
PRINCIPES FONDAMENTAUX (NON NÉGOCIABLES)
═══════════════════════════════════════════

1. NEUTRALITÉ
Tu n'utilises jamais de langage émotionnel, accusatoire ou subjectif.

2. PRIMAUTÉ DES FAITS
Tu ne conserves que les éléments factuels ou explicitement rapportés.
Les impressions et ressentis sont reformulés comme tels ou pondérés.

3. PROTECTION DES PERSONNES
Tu ne nommes JAMAIS :
- de vendeur
- de garage
- de concessionnaire
- de mécanicien
- de personne physique ou morale
- de marque à des fins accusatoires

4. NON-DIFFAMATION
Tu ne qualifies jamais un comportement de frauduleux, malhonnête, illégal ou trompeur.

5. PRUDENCE ET CONDITIONNEL
En cas d'incertitude, tu l'indiques explicitement.
Tu n'extrapoles jamais au-delà des informations fournies.

6. SÉPARATION DES RÔLES
L'utilisateur fournit de la matière brute.
VLINKS assume seul la responsabilité éditoriale du contenu publié.

═══════════════════════════════════════════
RÈGLE CRITIQUE DE PRÉSERVATION DU SIGNAL
═══════════════════════════════════════════

❗ Ne JAMAIS supprimer ou minimiser un élément qui :
- Évoque un risque mécanique (usure, fuite, bruit, vibration)
- Évoque une divergence entre rapport écrit et discours oral
- Mentionne une usure anormale ou prématurée
- Mentionne un comportement suspect d'un vendeur ou garage
- Indique un historique d'accident ou de réparation majeure
- Signale une incohérence dans le kilométrage ou l'historique
- Rapporte un avis de mécanicien ou professionnel

Ces éléments DOIVENT apparaître dans key_facts, mechanic_signals ou risk_indicators selon leur nature.

═══════════════════════════════════════════
CE QUE TU FAIS
═══════════════════════════════════════════

- Reformuler l'information de manière neutre et factuelle
- Séparer faits, contexte et observations
- Assembler plusieurs pièces d'information cohérentes
- Structurer l'information pour un futur acheteur
- Qualifier la source et le niveau de crédibilité
- Évaluer un niveau de risque informatif, sans accusation
- Extraire TOUS les signaux mécaniques mentionnés
- Identifier les divergences entre documents et témoignages oraux

═══════════════════════════════════════════
CE QUE TU NE FAIS JAMAIS
═══════════════════════════════════════════

- Publier du texte brut tel quel
- Reproduire des propos émotionnels
- Nommer des individus ou entités
- Tirer des conclusions définitives
- Attribuer des intentions ou responsabilités
- SUPPRIMER des informations de risque pertinentes

═══════════════════════════════════════════
FORMAT DE SORTIE OBLIGATOIRE (V2)
═══════════════════════════════════════════

Tu produis UNIQUEMENT un objet JSON structuré contenant :

{
  "public_summary": "Résumé neutre et publiable, 6-8 lignes maximum, orienté acheteur. Inclut les points clés sans détail technique excessif.",
  "key_facts": ["Fait clé 1 - reformulé de façon neutre", "Fait clé 2", ...],
  "mechanic_signals": ["Signal mécanique 1 - usure, bruit, fuite, etc.", ...],
  "risk_indicators": ["Indicateur de risque 1 - incohérence, divergence, etc.", ...],
  "document_analysis": "Analyse du document joint si fourni. Résumé des points clés du document officiel.",
  "document_vs_oral_gap": "Différences notables entre le contenu du document et le témoignage oral du contributeur. Null si pas de divergence ou pas de document.",
  "technical_findings": ["Constat technique 1", "Constat technique 2", ...],
  "risk_level": <nombre de 1 à 5>,
  "confidence_level": "<low|medium|high>",
  "confidence_source": "<inspection professionnelle | observation personnelle | historique véhicule | échange avec propriétaire | échange avec mécanicien>",
  "source_credibility": "Qualification neutre de la source sans noms propres",
  "publishable": <true | false>
}

RÈGLES POUR LES CHAMPS :

public_summary:
- Maximum 6-8 lignes
- Orienté futur acheteur
- Inclut la conclusion principale sans jargon excessif
- Mentionne s'il y a des points d'attention

key_facts:
- Faits objectifs et vérifiables
- Reformulés de façon neutre
- Inclut dates, kilométrages, interventions

mechanic_signals:
- TOUT signal mécanique mentionné (usure, bruit, fuite, vibration, etc.)
- Même les signaux mineurs doivent être capturés
- Format: description du signal + contexte

risk_indicators:
- Incohérences détectées
- Divergences entre sources
- Éléments suspects (sans accusation)
- Historique préoccupant

document_vs_oral_gap:
- Null si pas de document ou pas de divergence
- Sinon: description factuelle des différences

confidence_level:
- "high": Document officiel, inspection professionnelle, multiple sources concordantes
- "medium": Témoignage propriétaire, observation directe, source unique fiable
- "low": Ouï-dire, source anonyme, information non vérifiable

ÉCHELLE DE RISQUE :
1 = Aucun problème détecté
2 = Problèmes mineurs (usure normale)
3 = Problèmes modérés nécessitant attention
4 = Problèmes significatifs
5 = Problèmes critiques de sécurité ou anomalie majeure détectée

RÈGLES POUR source_credibility :
- Ne JAMAIS citer de nom de garage, marque, concessionnaire ou entreprise
- Qualifier selon : "réseau constructeur", "garage certifié", "inspection indépendante", "observation propriétaire", "échange verbal"
- Phrase toujours neutre, factuelle et sans mention de noms propres

Si les informations sont insuffisantes ou juridiquement risquées, publishable DOIT être false.

Si le contenu est vide, incompréhensible ou ne contient aucune information utile sur le véhicule, retourne :
{
  "public_summary": "",
  "key_facts": [],
  "mechanic_signals": [],
  "risk_indicators": [],
  "document_analysis": null,
  "document_vs_oral_gap": null,
  "technical_findings": [],
  "risk_level": 1,
  "confidence_level": "low",
  "confidence_source": "observation personnelle",
  "source_credibility": "Source non qualifiable.",
  "publishable": false
}

═══════════════════════════════════════════
PRIORITÉ ABSOLUE
═══════════════════════════════════════════

Ta priorité absolue est :
- la préservation de TOUS les signaux de risque
- la protection des personnes
- la neutralité du contenu
- la continuité de l'information dans le temps
- la clarté pour les acheteurs futurs

FIN DE LA CONSTITUTION VLINKS V2`;

interface RawContribution {
  id: string;
  user_id: string;
  vin_id: string;
  contribution_type: string;
  title: string;
  summary: string | null;
  details: string | null;
  is_anonymous: boolean;
  is_owner_contribution: boolean;
  intervention_type: string | null;
  intervention_date: string | null;
  mileage_at_intervention: number | null;
}

interface AIResponse {
  public_summary: string;
  key_facts: string[];
  mechanic_signals: string[];
  risk_indicators: string[];
  document_analysis: string | null;
  document_vs_oral_gap: string | null;
  technical_findings: string[];
  risk_level: number;
  confidence_level: string;
  confidence_source: string;
  source_credibility: string;
  publishable: boolean;
}

interface UserProfile {
  username: string | null;
  display_name: string | null;
  public_id: string | null;
}

interface ContributionDocument {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  description: string | null;
}

// Simple function to extract text content description from documents
async function getDocumentContext(supabase: any, contributionId: string): Promise<{ hasDocuments: boolean; documentDescription: string }> {
  // Fetch documents attached to this contribution
  const { data: documents, error } = await supabase
    .from('contribution_documents')
    .select('file_name, file_type, description')
    .eq('contribution_id', contributionId);

  if (error || !documents || documents.length === 0) {
    return { hasDocuments: false, documentDescription: '' };
  }

  // Build a description of attached documents for the AI
  const docDescriptions = documents.map((doc: ContributionDocument) => {
    let desc = `- Document: ${doc.file_name}`;
    if (doc.file_type) desc += ` (type: ${doc.file_type})`;
    if (doc.description) desc += ` - Description: ${doc.description}`;
    return desc;
  }).join('\n');

  return {
    hasDocuments: true,
    documentDescription: `
═══════════════════════════════════════════
DOCUMENTS JOINTS À CETTE CONTRIBUTION
═══════════════════════════════════════════
${docDescriptions}

Note: Les documents ci-dessus ont été fournis par le contributeur. 
Analyse les descriptions et compare avec le témoignage oral pour détecter d'éventuelles divergences.
`
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contribution_id } = await req.json();

    if (!contribution_id) {
      console.error('Missing contribution_id in request');
      throw new Error('contribution_id is required');
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration is missing');
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

    // Fetch user profile for author info (SECURITY: never expose user_id to public)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('username, display_name, public_id')
      .eq('user_id', rawContribution.user_id)
      .single();

    // Determine author label and public_id based on anonymity
    const authorLabel = rawContribution.is_anonymous 
      ? 'Anonyme' 
      : (userProfile?.username || userProfile?.display_name || 'Contributeur');
    
    const authorPublicId = rawContribution.is_anonymous 
      ? null 
      : (userProfile?.public_id || null);

    console.log(`Author info: label="${authorLabel}", public_id=${authorPublicId ? 'set' : 'null'}`);

    // Update status to processing
    await supabase
      .from('raw_contributions')
      .update({ processing_status: 'processing' })
      .eq('id', contribution_id);

    // Get document context if any documents are attached
    const { hasDocuments, documentDescription } = await getDocumentContext(supabase, contribution_id);
    console.log(`Documents attached: ${hasDocuments}`);

    // Build raw user content (preserved unmodified)
    const rawUserContent = `
Type: ${rawContribution.contribution_type}
Titre: ${rawContribution.title}
Résumé: ${rawContribution.summary || 'Non fourni'}
Détails: ${rawContribution.details || 'Non fournis'}
${rawContribution.intervention_type ? `Type d'intervention: ${rawContribution.intervention_type}` : ''}
${rawContribution.intervention_date ? `Date: ${rawContribution.intervention_date}` : ''}
${rawContribution.mileage_at_intervention ? `Kilométrage: ${rawContribution.mileage_at_intervention} km` : ''}
`.trim();

    // Build content for AI analysis
    let contentToAnalyze: string;
    
    if (rawContribution.is_owner_contribution) {
      // Owner contribution - include intervention details
      contentToAnalyze = `
CONTRIBUTION PROPRIÉTAIRE - À traiter avec la mention "Source : propriétaire du véhicule"

Type d'intervention : ${rawContribution.intervention_type || 'Non spécifié'}
Date de l'intervention : ${rawContribution.intervention_date || 'Non spécifiée'}
Kilométrage : ${rawContribution.mileage_at_intervention ? rawContribution.mileage_at_intervention.toLocaleString() + ' km' : 'Non spécifié'}
Description : ${rawContribution.summary || 'Non fournie'}
Détails complets : ${rawContribution.details || 'Non fournis'}

IMPORTANT : Cette contribution provient du propriétaire déclaré du véhicule. 
Reformuler de manière factuelle et neutre, sans jugement.
La source doit être qualifiée comme "propriétaire déclaré".
${documentDescription}
      `.trim();
    } else {
      // Standard third-party contribution
      contentToAnalyze = `
Type de contribution : ${rawContribution.contribution_type}
Titre : ${rawContribution.title}
Résumé : ${rawContribution.summary || 'Non fourni'}
Détails : ${rawContribution.details || 'Non fournis'}
${documentDescription}
      `.trim();
    }

    console.log('Calling Lovable AI Gateway with enriched prompt...');

    // Call Lovable AI Gateway (uses google/gemini-2.5-flash by default)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: contentToAnalyze }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI Gateway error:', aiResponse.status, errorText);
      
      // Handle rate limits
      if (aiResponse.status === 429) {
        await supabase
          .from('raw_contributions')
          .update({ 
            processing_status: 'pending',
            processing_error: 'Rate limit exceeded, will retry later'
          })
          .eq('id', contribution_id);

        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded, please try again later'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle payment required
      if (aiResponse.status === 402) {
        await supabase
          .from('raw_contributions')
          .update({ 
            processing_status: 'failed',
            processing_error: 'AI credits exhausted'
          })
          .eq('id', contribution_id);

        return new Response(JSON.stringify({ 
          success: false,
          error: 'AI credits exhausted, please add funds'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update status to failed
      await supabase
        .from('raw_contributions')
        .update({ 
          processing_status: 'failed',
          processing_error: `AI Gateway error: ${aiResponse.status} - ${errorText.substring(0, 200)}`
        })
        .eq('id', contribution_id);

      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error('No content in AI response:', JSON.stringify(aiData));
      throw new Error('No content in AI response');
    }

    console.log('AI response received');

    // Parse AI response - extract JSON from possible markdown code blocks
    let aiResult: AIResponse;
    try {
      // Remove markdown code blocks if present
      let jsonContent = aiContent.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.slice(7);
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(0, -3);
      }
      jsonContent = jsonContent.trim();
      
      aiResult = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Content:', aiContent);
      
      await supabase
        .from('raw_contributions')
        .update({ 
          processing_status: 'failed',
          processing_error: 'Failed to parse AI response as JSON'
        })
        .eq('id', contribution_id);

      throw new Error('Failed to parse AI response');
    }

    // Validate AI response structure - handle both old (summary_public) and new (public_summary) field names
    const publicSummary = aiResult.public_summary || (aiResult as any).summary_public || '';
    
    if (typeof publicSummary !== 'string' ||
        !Array.isArray(aiResult.technical_findings) ||
        typeof aiResult.risk_level !== 'number' ||
        typeof aiResult.confidence_source !== 'string' ||
        typeof aiResult.source_credibility !== 'string' ||
        typeof aiResult.publishable !== 'boolean') {
      console.error('Invalid AI response structure:', JSON.stringify(aiResult));
      
      await supabase
        .from('raw_contributions')
        .update({ 
          processing_status: 'failed',
          processing_error: 'AI response missing required fields'
        })
        .eq('id', contribution_id);

      throw new Error('Invalid AI response structure');
    }

    // Clamp risk_level to 1-5
    aiResult.risk_level = Math.min(5, Math.max(1, aiResult.risk_level));

    // Validate confidence_level
    const validConfidenceLevels = ['low', 'medium', 'high'];
    const confidenceLevel = validConfidenceLevels.includes(aiResult.confidence_level) 
      ? aiResult.confidence_level 
      : 'medium';

    console.log('Creating public contribution with enriched data...');

    // Insert into public_contributions
    // For owner contributions, force source to "propriétaire déclaré"
    const finalConfidenceSource = rawContribution.is_owner_contribution 
      ? "propriétaire déclaré" 
      : aiResult.confidence_source;
    
    const finalSourceCredibility = rawContribution.is_owner_contribution
      ? "Déclaration du propriétaire du véhicule"
      : aiResult.source_credibility;

    // SECURITY: Write author_label and author_public_id instead of user_id
    // user_id is still stored for internal reference but NOT exposed via RLS
    const { data: publicContribution, error: insertError } = await supabase
      .from('public_contributions')
      .insert({
        raw_contribution_id: contribution_id,
        user_id: rawContribution.user_id, // Internal reference only, not exposed via RLS
        vin_id: rawContribution.vin_id,
        contribution_type: rawContribution.contribution_type,
        // AI-processed content - V2 enriched
        summary_public: publicSummary,
        raw_user_content: rawUserContent,
        key_facts: aiResult.key_facts || [],
        mechanic_signals: aiResult.mechanic_signals || [],
        risk_indicators: aiResult.risk_indicators || [],
        document_analysis: aiResult.document_analysis || null,
        document_vs_oral_gap: aiResult.document_vs_oral_gap || null,
        technical_findings: aiResult.technical_findings || [],
        risk_level: aiResult.risk_level,
        confidence_level: confidenceLevel,
        confidence_source: finalConfidenceSource,
        source_credibility: finalSourceCredibility,
        // Metadata
        is_anonymous: rawContribution.is_anonymous,
        publishable: aiResult.publishable,
        ai_model_used: 'google/gemini-2.5-flash',
        is_owner_contribution: rawContribution.is_owner_contribution,
        intervention_type: rawContribution.intervention_type,
        intervention_date: rawContribution.intervention_date,
        mileage_at_intervention: rawContribution.mileage_at_intervention,
        has_document_attached: hasDocuments,
        // NEW: Safe public author identification
        author_label: authorLabel,
        author_public_id: authorPublicId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting public contribution:', insertError);
      
      await supabase
        .from('raw_contributions')
        .update({ 
          processing_status: 'failed',
          processing_error: `Database error: ${insertError.message}`
        })
        .eq('id', contribution_id);

      throw new Error(`Failed to create public contribution: ${insertError.message}`);
    }

    // Update raw contribution status to completed
    await supabase
      .from('raw_contributions')
      .update({ 
        processing_status: 'completed',
        processing_error: null
      })
      .eq('id', contribution_id);

    console.log(`Contribution processed successfully: ${publicContribution.id}, publishable: ${aiResult.publishable}`);
    console.log(`Enriched data: ${aiResult.key_facts?.length || 0} facts, ${aiResult.mechanic_signals?.length || 0} signals, ${aiResult.risk_indicators?.length || 0} risks`);

    return new Response(JSON.stringify({ 
      success: true,
      public_contribution_id: publicContribution.id,
      publishable: aiResult.publishable,
      enriched: {
        key_facts_count: aiResult.key_facts?.length || 0,
        mechanic_signals_count: aiResult.mechanic_signals?.length || 0,
        risk_indicators_count: aiResult.risk_indicators?.length || 0,
        has_document_analysis: !!aiResult.document_analysis,
        has_gap_analysis: !!aiResult.document_vs_oral_gap
      }
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
