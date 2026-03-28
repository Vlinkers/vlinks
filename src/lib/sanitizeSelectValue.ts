/**
 * Sanitize a value before passing it to a Radix Select component.
 * Radix <Select.Item /> crashes if value is null, undefined, or empty string.
 *
 * @param value - The raw value (possibly null/undefined/"")
 * @param fallback - Fallback value (default: "none")
 * @returns A safe, non-empty string
 */
export function sanitizeSelectValue(
  value: string | null | undefined,
  fallback = "none"
): string {
  return value != null && value !== "" ? value : fallback;
}

/**
 * Convert a select value back to a storable value.
 * Converts the fallback sentinel back to null for database storage.
 */
export function desanitizeSelectValue(
  value: string,
  fallback = "none"
): string | null {
  return value === fallback ? null : value;
}
