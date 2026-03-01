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
  summaryPublic: string;
  isOwnerContribution: boolean;
  interventionType: string | null;
  interventionDate: string | null;
  mileageAtIntervention: number | null;
  isAnonymous: boolean;
  // Media
  hasDocuments: boolean;
  documentCount: number;
  hasPhotos: boolean;
  photoCount: number;
  photos: ContributionPhoto[];
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
}

async function fetchVINData(vin: string): Promise<VINData | null> {
  const { data: vinRecord, error: vinError } = await supabase
    .from("vins")
    .select("*")
    .eq("vin", vin)
    .maybeSingle();

  if (vinError) throw vinError;
  if (!vinRecord) return null;

  const { data: contributions, error: contribError } = await supabase
    .from("public_contributions")
    .select(`
      id,
      contribution_type,
      is_anonymous,
      is_owner_contribution,
      intervention_type,
      intervention_date,
      mileage_at_intervention,
      created_at,
      author_label,
      author_public_id
    `)
    .eq("vin_id", vinRecord.id)
    .order("created_at", { ascending: false });

  if (contribError) throw contribError;

  const transformedContributions: PublicContribution[] = (contributions || []).map(c => ({
    id: c.id,
    type: c.contribution_type,
    date: new Date(c.created_at).toLocaleDateString("fr-CA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    author: c.author_label || "Anonyme",
    authorPublicId: c.author_public_id,
    authorVerified: c.is_owner_contribution || false,
    summaryPublic: "",
    isOwnerContribution: c.is_owner_contribution || false,
    interventionType: c.intervention_type,
    interventionDate: c.intervention_date,
    mileageAtIntervention: c.mileage_at_intervention,
    isAnonymous: c.is_anonymous || false,
    hasDocuments: false,
    documentCount: 0,
    hasPhotos: false,
    photoCount: 0,
    photos: [],
  }));

  const uniqueContributors = new Set(
    (contributions || [])
      .filter(c => !c.is_anonymous && c.author_public_id)
      .map(c => c.author_public_id)
  ).size;

  const lastUpdated = vinRecord.updated_at
    ? formatRelativeTime(new Date(vinRecord.updated_at))
    : "Jamais";

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
