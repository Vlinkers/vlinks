import { supabase } from "@/integrations/supabase/client";

/**
 * Build a public URL for a photo stored in the `vin-photos` bucket.
 * Pass-through if the path is already a full URL.
 * Single source of truth — used by PhotosView, ContributionsView, OwnerView, detail panel and admin.
 */
export function buildPhotoUrl(filePath: string | null | undefined): string {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  return supabase.storage.from("vin-photos").getPublicUrl(filePath).data.publicUrl;
}
