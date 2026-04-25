import { supabase } from "@/integrations/supabase/client";

const PUBLIC_STORAGE_MARKER = "/storage/v1/object/public/";
const KNOWN_PUBLIC_BUCKETS = ["vin-photos", "vin-documents"] as const;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseStorageReference(filePath: string, defaultBucket: string) {
  const trimmed = filePath.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const markerIndex = url.pathname.indexOf(PUBLIC_STORAGE_MARKER);
      if (markerIndex === -1) return { externalUrl: encodeURI(trimmed) };

      const storagePath = url.pathname.slice(markerIndex + PUBLIC_STORAGE_MARKER.length);
      const [bucket, ...pathParts] = storagePath.split("/");
      return {
        bucket: safeDecode(bucket || defaultBucket),
        path: pathParts.map(safeDecode).join("/"),
      };
    } catch {
      return { externalUrl: encodeURI(trimmed) };
    }
  }

  const normalized = trimmed.replace(/^\/+/, "");
  const matchingBucket = KNOWN_PUBLIC_BUCKETS.find((bucket) => normalized.startsWith(`${bucket}/`));

  return matchingBucket
    ? { bucket: matchingBucket, path: normalized.slice(matchingBucket.length + 1) }
    : { bucket: defaultBucket, path: normalized };
}

export function buildPublicStorageUrl(filePath: string | null | undefined, defaultBucket: string): string {
  if (!filePath) return "";
  const ref = parseStorageReference(filePath, defaultBucket);
  if ("externalUrl" in ref) return ref.externalUrl;
  if (!ref.path) return "";

  return supabase.storage.from(ref.bucket).getPublicUrl(ref.path).data.publicUrl;
}

/**
 * Build a public URL for a photo stored in the `vin-photos` bucket.
 * Pass-through if the path is already a full URL.
 * Single source of truth — used by PhotosView, ContributionsView, OwnerView, detail panel and admin.
 */
export function buildPhotoUrl(filePath: string | null | undefined): string {
  return buildPublicStorageUrl(filePath, "vin-photos");
}
