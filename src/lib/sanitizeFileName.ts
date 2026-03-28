/**
 * Sanitize a file name for safe storage in Supabase Storage.
 * 
 * - Strips accents/diacritics (é→e, à→a, ç→c, etc.)
 * - Replaces spaces with hyphens
 * - Removes all characters except alphanumerics, hyphens, underscores, dots
 * - Preserves the file extension
 * - Never returns an empty string
 */
export function sanitizeFileName(filename: string): string {
  if (!filename || filename.trim() === "") return "file";

  // Separate extension from name
  const lastDot = filename.lastIndexOf(".");
  const hasExtension = lastDot > 0;
  const name = hasExtension ? filename.slice(0, lastDot) : filename;
  const ext = hasExtension ? filename.slice(lastDot) : "";

  // Normalize unicode → decompose accents, then strip combining marks
  const sanitized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/\s+/g, "-")           // spaces → hyphens
    .replace(/[^a-zA-Z0-9\-_]/g, "") // remove everything except safe chars
    .replace(/-+/g, "-")            // collapse multiple hyphens
    .replace(/^-|-$/g, "");         // trim leading/trailing hyphens

  const safeName = sanitized || "file";
  return `${safeName}${ext.toLowerCase()}`;
}

/**
 * Build a unique, sanitized file path for Supabase Storage upload.
 * Prepends a timestamp to guarantee uniqueness.
 */
export function buildSafeFilePath(
  prefix: string,
  originalFileName: string
): string {
  const safe = sanitizeFileName(originalFileName);
  return `${prefix}/${Date.now()}_${safe}`;
}
