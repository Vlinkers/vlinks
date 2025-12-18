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
  authorVerified: boolean;
  // AI-processed fields - NEVER raw user text
  summaryPublic: string;
  technicalFindings: string[];
  riskLevel: number;
  confidenceSource: string;
  sourceCredibility: string;
  // Metadata
  isOwnerContribution: boolean;
  interventionType: string | null;
  interventionDate: string | null;
  mileageAtIntervention: number | null;
  // Legacy fields for photos/documents (linked via raw_contribution)
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
  // CRITICAL: Never read from vin_contributions or raw_contributions client-side
  const { data: contributions, error: contribError } = await supabase
    .from("public_contributions")
    .select(`
      id,
      user_id,
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
      raw_contribution_id
    `)
    .eq("vin_id", vinRecord.id)
    .eq("publishable", true)
    .order("created_at", { ascending: false });

  if (contribError) throw contribError;

  // Fetch profiles for contributors
  const userIds = [...new Set((contributions || []).map(c => c.user_id))];
  
  let profilesMap: Record<string, { display_name: string | null; is_verified: boolean }> = {};
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, is_verified")
      .in("user_id", userIds);
    
    if (profiles) {
      profilesMap = profiles.reduce((acc, p) => {
        acc[p.user_id] = { display_name: p.display_name, is_verified: p.is_verified };
        return acc;
      }, {} as Record<string, { display_name: string | null; is_verified: boolean }>);
    }
  }

  // Fetch photos from vin_contributions table (linked via the same user/vin)
  // Note: Photos are stored in contribution_photos linked to vin_contributions
  const { data: legacyContributions } = await supabase
    .from("vin_contributions")
    .select(`
      id,
      user_id,
      contribution_photos (id, file_path, file_name, caption),
      contribution_documents (id)
    `)
    .eq("vin_id", vinRecord.id);

  // Build a map of user contributions to their photos/docs
  const photosByUser: Record<string, { photos: ContributionPhoto[], docCount: number }> = {};
  if (legacyContributions) {
    for (const lc of legacyContributions) {
      const photosRaw = lc.contribution_photos as { id: string; file_path: string; file_name: string; caption: string | null }[] || [];
      const docCount = (lc.contribution_documents as { id: string }[])?.length || 0;
      
      const photos: ContributionPhoto[] = photosRaw.map(photo => ({
        id: photo.id,
        url: photo.file_path, // Already public URL from storage
        caption: photo.caption,
        fileName: photo.file_name,
      }));

      if (!photosByUser[lc.user_id]) {
        photosByUser[lc.user_id] = { photos: [], docCount: 0 };
      }
      photosByUser[lc.user_id].photos.push(...photos);
      photosByUser[lc.user_id].docCount += docCount;
    }
  }

  // Transform contributions - ONLY AI-processed content
  const transformedContributions: PublicContribution[] = (contributions || []).map(c => {
    const profile = profilesMap[c.user_id];
    const userMedia = photosByUser[c.user_id] || { photos: [], docCount: 0 };

    return {
      id: c.id,
      type: c.contribution_type,
      date: new Date(c.created_at).toLocaleDateString("fr-CA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      author: c.is_anonymous ? "Anonyme" : (profile?.display_name || "Contributeur"),
      authorVerified: profile?.is_verified || false,
      // AI-processed fields only
      summaryPublic: c.summary_public,
      technicalFindings: c.technical_findings || [],
      riskLevel: c.risk_level || 1,
      confidenceSource: c.confidence_source || "observation personnelle",
      sourceCredibility: c.source_credibility || "",
      // Metadata
      isOwnerContribution: c.is_owner_contribution || false,
      interventionType: c.intervention_type,
      interventionDate: c.intervention_date,
      mileageAtIntervention: c.mileage_at_intervention,
      // Media
      hasDocuments: userMedia.docCount > 0,
      documentCount: userMedia.docCount,
      hasPhotos: userMedia.photos.length > 0,
      photoCount: userMedia.photos.length,
      photos: userMedia.photos,
      isAnonymous: c.is_anonymous || false,
    };
  });

  // Calculate unique contributors
  const uniqueContributors = new Set(
    (contributions || []).filter(c => !c.is_anonymous).map(c => c.user_id)
  ).size;

  // Format last updated
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
