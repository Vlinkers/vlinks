import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useVINFollow(vin: string | undefined) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkFollow = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !vin) {
        setUserId(user?.id ?? null);
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("vin_followers")
        .select("id")
        .eq("user_id", user.id)
        .eq("vin", vin)
        .maybeSingle();

      setIsFollowing(!!data);
    };
    checkFollow();
  }, [vin]);

  const toggleFollow = useCallback(async () => {
    if (!userId || !vin) return false;
    setIsLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("vin_followers")
          .delete()
          .eq("user_id", userId)
          .eq("vin", vin);
        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from("vin_followers")
          .insert({ user_id: userId, vin });
        if (error) throw error;
        setIsFollowing(true);
      }
      return true;
    } catch (err) {
      console.error("Error toggling follow:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, vin, isFollowing]);

  return { isFollowing, isLoading, userId, toggleFollow };
}
