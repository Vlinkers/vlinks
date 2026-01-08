import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";

export type ContributionType = Enums<"contribution_type">;

export interface ContributionPhoto {
  id: string;
  url: string;
  caption: string | null;
  fileName: string;
}

export interface PublicContribution {
  id: string;
  type: ContributionType;
  date: string;
  author: string;
  authorPublicId: string | null;
  authorVerified: boolean;
  // AI-processed fields - NEVER raw user text in summary
  summaryPublic: string;
  technicalFindings: string[];
  riskLevel: number;
  confidenceSource: string;
  sourceCredibility: string;
  // V2 enriched fields
  keyFacts: string[];
  mechanicSignals: string[];
  riskIndicators: string[];
  documentAnalysis: string | null;
  documentVsOralGap: string | null;
  confidenceLevel: 'low' | 'medium' | 'high';
  hasDocumentAttached: boolean;
  sourceEvidence: string[];
  // Metadata
  isOwnerContribution: boolean;
  interventionType: string | null;
  interventionDate: string | null;
  mileageAtIntervention: number | null;
  // Legacy fields for photos/documents - no longer linked via user_id
  hasDocuments: boolean;
  documentCount: number;
  hasPhotos: boolean;
  photoCount: number;
  photos: ContributionPhoto[];
  isAnonymous: boolean;
}

export interface VINData {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  trustScore: number;
  totalContributions: number;
  uniqueContributors: number;
  lastUpdated: string;
  contributions: PublicContribution[];
  // Aggregated data for report
  allKeyFacts: string[];
  allMechanicSignals: string[];
  allRiskIndicators: string[];
  hasHighRisk: boolean;
  averageRiskLevel: number;
}

async function fetchVINData(vin: string): Promise<VINData | null> {
  // First, try to find the VIN
  const { data: vinRecord, error: vinError } = await supabase
    .from("vins")
    .select("*")
    .eq("vin", vin)
    .maybeSingle();

  if (vinError) throw vinError;

  // If VIN doesn't exist, return null
  if (!vinRecord) {
    return null;
  }

  // Fetch ONLY AI-processed, publishable contributions from public_contributions
  // SECURITY: Never read user_id - use author_label and author_public_id instead
  const { data: contributions, error: contribError } = await supabase
    .from("public_contributions")
    .select(`
      id,
      contribution_type,
      summary_public,
      technical_findings,
      risk_level,
      confidence_source,
      source_credibility,
      is_anonymous,
      is_owner_contribution,
      intervention_type,
      intervention_date,
      mileage_at_intervention,
      created_at,
      author_label,
      author_public_id,
      key_facts,
      mechanic_signals,
      risk_indicators,
      document_analysis,
      document_vs_oral_gap,
      source_evidence,
      confidence_level,
      has_document_attached
    `)
    .eq("vin_id", vinRecord.id)
    .eq("publishable", true)
    .order("created_at", { ascending: false });

  if (contribError) throw contribError;

  // Aggregate all facts, signals, and risks
  const allKeyFacts: string[] = [];
  const allMechanicSignals: string[] = [];
  const allRiskIndicators: string[] = [];
  let totalRiskLevel = 0;
  let hasHighRisk = false;

  // Transform contributions - ONLY AI-processed content, NO user_id exposure
  const transformedContributions: PublicContribution[] = (contributions || []).map(c => {
    // Aggregate data
    if (c.key_facts) allKeyFacts.push(...c.key_facts);
    if (c.mechanic_signals) allMechanicSignals.push(...c.mechanic_signals);
    if (c.risk_indicators) allRiskIndicators.push(...c.risk_indicators);
    totalRiskLevel += c.risk_level || 1;
    if ((c.risk_level || 1) >= 4) hasHighRisk = true;

    return {
      id: c.id,
      type: c.contribution_type,
      date: new Date(c.created_at).toLocaleDateString("fr-CA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      // SECURITY: Use pre-computed author_label from edge function, never fetch user info client-side
      author: c.author_label || "Anonyme",
      authorPublicId: c.author_public_id,
      authorVerified: c.is_owner_contribution || false, // Owner contributions are "verified"
      // AI-processed fields only
      summaryPublic: c.summary_public,
      technicalFindings: c.technical_findings || [],
      riskLevel: c.risk_level || 1,
      confidenceSource: c.confidence_source || "observation personnelle",
      sourceCredibility: c.source_credibility || "",
      // V2 enriched fields
      keyFacts: c.key_facts || [],
      mechanicSignals: c.mechanic_signals || [],
      riskIndicators: c.risk_indicators || [],
      documentAnalysis: c.document_analysis || null,
      documentVsOralGap: c.document_vs_oral_gap || null,
      confidenceLevel: (c.confidence_level as 'low' | 'medium' | 'high') || 'medium',
      hasDocumentAttached: c.has_document_attached || false,
      sourceEvidence: c.source_evidence || ['Texte utilisateur uniquement'],
      // Metadata
      isOwnerContribution: c.is_owner_contribution || false,
      interventionType: c.intervention_type,
      interventionDate: c.intervention_date,
      mileageAtIntervention: c.mileage_at_intervention,
      // Media - no longer linked via user_id for security
      hasDocuments: c.has_document_attached || false,
      documentCount: c.has_document_attached ? 1 : 0,
      hasPhotos: false,
      photoCount: 0,
      photos: [],
      isAnonymous: c.is_anonymous || false,
    };
  });

  // Calculate unique contributors based on author_public_id (excluding anonymous)
  const uniqueContributors = new Set(
    (contributions || [])
      .filter(c => !c.is_anonymous && c.author_public_id)
      .map(c => c.author_public_id)
  ).size;

  // Format last updated
  const lastUpdated = vinRecord.updated_at
    ? formatRelativeTime(new Date(vinRecord.updated_at))
    : "Jamais";

  // Calculate average risk level
  const averageRiskLevel = contributions && contributions.length > 0
    ? totalRiskLevel / contributions.length
    : 0;

  return {
    id: vinRecord.id,
    vin: vinRecord.vin,
    make: vinRecord.make,
    model: vinRecord.model,
    year: vinRecord.year,
    trustScore: vinRecord.trust_score || 0,
    totalContributions: contributions?.length || 0,
    uniqueContributors,
    lastUpdated,
    contributions: transformedContributions,
    // Aggregated data
    allKeyFacts: [...new Set(allKeyFacts)], // Deduplicate
    allMechanicSignals: [...new Set(allMechanicSignals)],
    allRiskIndicators: [...new Set(allRiskIndicators)],
    hasHighRisk,
    averageRiskLevel,
  };
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

export function useVINData(vin: string | undefined) {
  return useQuery({
    queryKey: ["vin", vin],
    queryFn: () => fetchVINData(vin!),
    enabled: !!vin,
  });
}
