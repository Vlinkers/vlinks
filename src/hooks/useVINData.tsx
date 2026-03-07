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

export interface ContributionDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  description: string | null;
}

export interface PublicContribution {
  id: string;
  type: ContributionType;
  date: string;
  author: string;
  authorPublicId: string | null;
  authorVerified: boolean;
  summaryPublic: string;
  title: string | null;
  details: string | null;
  isOwnerContribution: boolean;
  interventionType: string | null;
  interventionDate: string | null;
  mileageAtIntervention: number | null;
  isAnonymous: boolean;
  // Media
  hasDocuments: boolean;
  documentCount: number;
  documents: ContributionDocument[];
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

  const { data: contributions, error: contribError } = await (supabase
    .from("public_contributions")
    .select(`
      id,
      user_id,
      contribution_type,
      is_anonymous,
      is_owner_contribution,
      intervention_type,
      intervention_date,
      mileage_at_intervention,
      created_at,
      author_label,
      author_public_id,
      title,
      summary,
      details
    `)
    .eq("vin_id", vinRecord.id) as any)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (contribError) throw contribError;

  // Fetch all vin_contributions for this VIN to map photos/documents
  const { data: vinContribs } = await supabase
    .from("vin_contributions")
    .select("id, user_id, contribution_type, created_at")
    .eq("vin_id", vinRecord.id);

  // Build a mapping from public_contribution to vin_contribution by matching user_id + type + approximate time
  const contribIds = (vinContribs || []).map(vc => vc.id);

  // Fetch all photos for these contributions (public bucket, anyone can view)
  let allPhotos: any[] = [];
  if (contribIds.length > 0) {
    const { data: photos } = await supabase
      .from("contribution_photos")
      .select("id, contribution_id, file_name, file_path, caption")
      .in("contribution_id", contribIds);
    allPhotos = photos || [];
  }

  // Fetch document metadata (RLS allows owner/admin only, so this may return empty for public users)
  let allDocuments: any[] = [];
  if (contribIds.length > 0) {
    const { data: docs } = await supabase
      .from("contribution_documents")
      .select("id, contribution_id, file_name, file_type, file_size, description")
      .in("contribution_id", contribIds);
    allDocuments = docs || [];
  }

  // Map vin_contributions by user_id+type+time for matching
  const vinContribMap = new Map<string, string>(); // key -> vin_contribution id
  for (const vc of (vinContribs || [])) {
    // Create a key from user_id + contribution_type + created_at (truncated to minute)
    const key = `${vc.user_id}|${vc.contribution_type}|${new Date(vc.created_at).toISOString().slice(0, 16)}`;
    vinContribMap.set(key, vc.id);
  }

  // Group photos and documents by contribution_id
  const photosByContrib = new Map<string, any[]>();
  for (const p of allPhotos) {
    const arr = photosByContrib.get(p.contribution_id) || [];
    arr.push(p);
    photosByContrib.set(p.contribution_id, arr);
  }

  const docsByContrib = new Map<string, any[]>();
  for (const d of allDocuments) {
    const arr = docsByContrib.get(d.contribution_id) || [];
    arr.push(d);
    docsByContrib.set(d.contribution_id, arr);
  }

  const transformedContributions: PublicContribution[] = (contributions || []).map((c: any) => {
    // Try to find matching vin_contribution
    const key = `${c.user_id}|${c.contribution_type}|${new Date(c.created_at).toISOString().slice(0, 16)}`;
    const vcId = vinContribMap.get(key);

    const photos: ContributionPhoto[] = vcId
      ? (photosByContrib.get(vcId) || []).map((p: any) => ({
          id: p.id,
          url: p.file_path,
          caption: p.caption,
          fileName: p.file_name,
        }))
      : [];

    const documents: ContributionDocument[] = vcId
      ? (docsByContrib.get(vcId) || []).map((d: any) => ({
          id: d.id,
          fileName: d.file_name,
          fileType: d.file_type,
          fileSize: d.file_size,
          description: d.description,
        }))
      : [];

    return {
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
      summaryPublic: c.summary || c.title || "",
      title: c.title || null,
      details: c.details || null,
      isOwnerContribution: c.is_owner_contribution || false,
      interventionType: c.intervention_type,
      interventionDate: c.intervention_date,
      mileageAtIntervention: c.mileage_at_intervention,
      isAnonymous: c.is_anonymous || false,
      hasDocuments: documents.length > 0,
      documentCount: documents.length,
      documents,
      hasPhotos: photos.length > 0,
      photoCount: photos.length,
      photos,
    };
  });

  // Filter out empty contributions (photo type with no photos, etc.)
  const validContributions = transformedContributions.filter(c => {
    const hasText = !!(c.title || c.summaryPublic || c.details);
    const hasMedia = c.hasPhotos || c.hasDocuments;
    return hasText || hasMedia;
  });

  const uniqueContributors = new Set(
    (contributions || [])
      .filter((c: any) => !c.is_anonymous && c.author_public_id)
      .map((c: any) => c.author_public_id)
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
    totalContributions: validContributions.length,
    uniqueContributors,
    lastUpdated,
    contributions: validContributions,
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
