import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

export type ContributionType = Enums<"contribution_type">;

export interface ContributionWithDetails {
  id: string;
  type: ContributionType;
  date: string;
  author: string;
  authorVerified: boolean;
  title: string;
  summary: string | null;
  details: string | null;
  helpful: number;
  hasDocuments: boolean;
  documentCount: number;
  hasPhotos: boolean;
  photoCount: number;
  tags: string[];
  decision: "purchased" | "passed" | null;
  passReason?: string;
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
  contributions: ContributionWithDetails[];
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

  // Fetch contributions for this VIN
  const { data: contributions, error: contribError } = await supabase
    .from("vin_contributions")
    .select(`
      *,
      contribution_documents (id),
      contribution_photos (id),
      contribution_tags (tag)
    `)
    .eq("vin_id", vinRecord.id)
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

  // Transform contributions
  const transformedContributions: ContributionWithDetails[] = (contributions || []).map(c => {
    const profile = profilesMap[c.user_id];
    const docCount = (c.contribution_documents as { id: string }[])?.length || 0;
    const photoCount = (c.contribution_photos as { id: string }[])?.length || 0;
    const tags = (c.contribution_tags as { tag: string }[])?.map(t => t.tag) || [];

    // Extract decision from details if contribution_type is purchase_decision
    let decision: "purchased" | "passed" | null = null;
    let passReason: string | undefined;
    
    if (c.contribution_type === "purchase_decision" && c.details) {
      try {
        const parsed = JSON.parse(c.details);
        decision = parsed.decision || null;
        passReason = parsed.passReason;
      } catch {
        // If not JSON, check for keywords
        if (c.details.toLowerCase().includes("acheté") || c.details.toLowerCase().includes("purchased")) {
          decision = "purchased";
        } else if (c.details.toLowerCase().includes("renoncé") || c.details.toLowerCase().includes("passed")) {
          decision = "passed";
        }
      }
    }

    return {
      id: c.id,
      type: c.contribution_type,
      date: new Date(c.created_at).toLocaleDateString("fr-CA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      author: c.is_anonymous ? "Anonyme" : (profile?.display_name || "Utilisateur"),
      authorVerified: profile?.is_verified || false,
      title: c.title,
      summary: c.summary,
      details: c.details,
      helpful: c.points_awarded || 0,
      hasDocuments: docCount > 0,
      documentCount: docCount,
      hasPhotos: photoCount > 0,
      photoCount: photoCount,
      tags,
      decision,
      passReason,
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
    totalContributions: vinRecord.contributions_count || 0,
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
