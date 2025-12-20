import { supabase } from "@/integrations/supabase/client";

// Reserved words that cannot be used as usernames
const RESERVED_WORDS = [
  "admin",
  "support",
  "vlinks",
  "vinmunity",
  "moderator",
  "mod",
  "system",
  "official",
  "help",
  "info",
  "contact",
  "team",
  "staff",
  "root",
  "null",
  "undefined",
  "test",
  "demo",
  "api",
];

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates username format and rules
 * - Length: 3-20 characters
 * - Allowed: letters (a-z, A-Z), digits (0-9), underscore (_)
 * - No spaces or special characters
 * - No reserved words
 */
export function validateUsernameFormat(username: string, language: "fr" | "en" = "fr"): UsernameValidationResult {
  const trimmed = username.trim();

  // Check length
  if (trimmed.length < 3) {
    return {
      valid: false,
      error: language === "fr" 
        ? "Le pseudonyme doit contenir au moins 3 caractères" 
        : "Username must be at least 3 characters",
    };
  }

  if (trimmed.length > 20) {
    return {
      valid: false,
      error: language === "fr" 
        ? "Le pseudonyme ne peut pas dépasser 20 caractères" 
        : "Username cannot exceed 20 characters",
    };
  }

  // Check allowed characters (alphanumeric + underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      error: language === "fr" 
        ? "Uniquement lettres, chiffres et underscore (_)" 
        : "Only letters, numbers, and underscore (_) allowed",
    };
  }

  // Check for reserved words (case-insensitive)
  if (RESERVED_WORDS.includes(trimmed.toLowerCase())) {
    return {
      valid: false,
      error: language === "fr" 
        ? "Ce pseudonyme est réservé" 
        : "This username is reserved",
    };
  }

  return { valid: true };
}

/**
 * Check if username is available (unique in database)
 */
export async function checkUsernameAvailability(
  username: string, 
  currentUserId?: string,
  language: "fr" | "en" = "fr"
): Promise<UsernameValidationResult> {
  const trimmed = username.trim().toLowerCase();

  // First validate format
  const formatResult = validateUsernameFormat(username, language);
  if (!formatResult.valid) {
    return formatResult;
  }

  // Check uniqueness in database (case-insensitive)
  let query = supabase
    .from("profiles")
    .select("id")
    .ilike("username", trimmed);

  // Exclude current user if updating
  if (currentUserId) {
    query = query.neq("user_id", currentUserId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Error checking username availability:", error);
    return {
      valid: false,
      error: language === "fr" 
        ? "Erreur lors de la vérification" 
        : "Error checking availability",
    };
  }

  if (data) {
    return {
      valid: false,
      error: language === "fr" 
        ? "Ce pseudonyme est déjà utilisé" 
        : "This username is already taken",
    };
  }

  return { valid: true };
}
