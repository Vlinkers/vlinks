import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Contributor = Tables<"contributors">;
type ContributorRole = Enums<"contributor_role">;
type ContributionFace = Enums<"contribution_face">;

export interface UseContributorReturn {
  contributor: Contributor | null;
  role: ContributorRole | null;
  face: ContributionFace | null;
  isLoading: boolean;
  isOwner: boolean;
  isVerifiedOwner: boolean;
  createContributor: (role: ContributorRole) => Promise<Contributor>;
  switchRole: (newRole: ContributorRole) => Promise<void>;
}

async function detectRole(userId: string, vinId: string): Promise<ContributorRole> {
  // Check owner claims
  const { data: claim } = await supabase
    .from("owner_claims")
    .select("status, verified_at")
    .eq("user_id", userId)
    .eq("vin_id", vinId)
    .maybeSingle();

  if (claim) {
    if (claim.status === "active") {
      // Check if verification exists and is approved
      const { data: verification } = await supabase
        .from("owner_verifications")
        .select("verification_status")
        .eq("user_id", userId)
        .eq("vin_id", vinId)
        .eq("verification_status", "verified")
        .maybeSingle();
      return verification ? "owner_verified" : "owner_unverified";
    }
    if (claim.status === "revoked") {
      return "former_owner";
    }
  }

  // Check professional status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_professional, professional_type")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.is_professional && profile.professional_type) {
    const typeMap: Record<string, ContributorRole> = {
      mechanic: "mechanic",
      inspector: "inspector",
      dealer: "dealer",
    };
    if (typeMap[profile.professional_type]) {
      return typeMap[profile.professional_type];
    }
  }

  return "buyer";
}

export function useContributor(vinId: string | undefined): UseContributorReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const queryKey = ["contributor", vinId, userId];

  const { data: contributor = null, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId || !vinId) return null;
      const { data, error } = await supabase
        .from("contributors")
        .select("*")
        .eq("user_id", userId)
        .eq("vin_id", vinId)
        .maybeSingle();
      if (error) throw error;
      return data as Contributor | null;
    },
    enabled: !!userId && !!vinId,
    staleTime: 1000 * 60 * 5,
  });

  const createMutation = useMutation({
    mutationFn: async (role: ContributorRole): Promise<Contributor> => {
      if (!userId || !vinId) throw new Error("Missing user or VIN");

      const resolvedRole = role || await detectRole(userId, vinId);

      const { data, error } = await supabase
        .from("contributors")
        .insert({
          user_id: userId,
          vin_id: vinId,
          role: resolvedRole,
          face: "face_a", // placeholder — overridden by DB trigger
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as Contributor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const switchMutation = useMutation({
    mutationFn: async (newRole: ContributorRole) => {
      if (!contributor) throw new Error("No contributor record");
      const { error } = await supabase
        .from("contributors")
        .update({ role: newRole })
        .eq("id", contributor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const role = contributor?.role ?? null;
  const face = contributor?.face ?? null;
  const isOwner = role === "owner_verified" || role === "owner_unverified";
  const isVerifiedOwner = role === "owner_verified";

  return {
    contributor,
    role,
    face,
    isLoading,
    isOwner,
    isVerifiedOwner,
    createContributor: (r: ContributorRole) => createMutation.mutateAsync(r),
    switchRole: (r: ContributorRole) => switchMutation.mutateAsync(r),
  };
}
