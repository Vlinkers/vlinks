import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function mapContributionType(type: string): string {
  if (type.includes("inspection")) return "inspection";
  if (type.includes("repair") || type.includes("mechanic")) return "repair";
  if (type.includes("maintenance")) return "maintenance";
  if (type.includes("accident")) return "accident";
  if (type.includes("sale") || type.includes("listing") || type === "for_sale") return "listing";
  if (type === "ownership_change" || type === "purchase_decision") return "purchase";
  if (type === "price_change") return "listing";
  return "other";
}

function mapEvidenceType(fileType: string | null): string {
  if (!fileType) return "other";
  if (fileType.includes("pdf")) return "document";
  if (fileType.includes("image") || fileType.includes("jpg") || fileType.includes("png") || fileType.includes("jpeg")) return "photo";
  return "other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller is admin
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
  if (claimsError || !claimsData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = claimsData.user.id;

  // Use service role for data operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const summary = {
    events_created: 0,
    contributors_created: 0,
    facts_created: 0,
    evidence_created: 0,
    red_flags_created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // 1. Fetch all non-migrated public contributions
    const { data: contributions, error: fetchErr } = await supabase
      .from("public_contributions")
      .select("*")
      .is("migrated_at", null)
      .eq("status", "approved");

    if (fetchErr) throw fetchErr;
    if (!contributions || contributions.length === 0) {
      return new Response(JSON.stringify({ ...summary, message: "Aucune contribution à migrer." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const migratedVinIds = new Set<string>();

    for (const contrib of contributions) {
      try {
        // Check for duplicate
        const { data: existing } = await supabase
          .from("events")
          .select("id")
          .eq("vin_id", contrib.vin_id)
          .eq("title", contrib.title || "Contribution migrée")
          .maybeSingle();

        if (existing) {
          summary.skipped++;
          // Still mark as migrated
          await supabase
            .from("public_contributions")
            .update({ migrated_at: new Date().toISOString() })
            .eq("id", contrib.id);
          continue;
        }

        // Step 1: Create event
        const eventType = mapContributionType(contrib.contribution_type);
        const { data: event, error: eventErr } = await supabase
          .from("events")
          .insert({
            vin_id: contrib.vin_id,
            event_type: eventType,
            event_date: contrib.intervention_date || contrib.created_at,
            title: contrib.title || "Contribution migrée",
            mileage_at_event: contrib.mileage_at_intervention,
            is_verified: true,
            description: contrib.summary || null,
          })
          .select("id")
          .single();

        if (eventErr) throw eventErr;
        summary.events_created++;

        // Step 2: Create or find contributor
        let contributorRole: string;
        if (contrib.is_anonymous) {
          contributorRole = "anonymous";
        } else if (contrib.is_owner_contribution) {
          contributorRole = "owner_unverified";
        } else {
          contributorRole = "buyer";
        }

        const contributorFace = contrib.is_owner_contribution ? "face_b" : "face_a";

        const { data: existingContributor } = await supabase
          .from("contributors")
          .select("id")
          .eq("user_id", contrib.user_id)
          .eq("vin_id", contrib.vin_id)
          .eq("role", contributorRole)
          .maybeSingle();

        let contributorId: string;
        if (existingContributor) {
          contributorId = existingContributor.id;
        } else {
          const { data: newContributor, error: contribErr } = await supabase
            .from("contributors")
            .insert({
              user_id: contrib.user_id,
              vin_id: contrib.vin_id,
              role: contributorRole,
              face: contributorFace,
              display_name: contrib.author_label || null,
              is_anonymous: contrib.is_anonymous ?? false,
            })
            .select("id")
            .single();

          if (contribErr) throw contribErr;
          contributorId = newContributor.id;
          summary.contributors_created++;
        }

        // Step 3: Create fact
        const factContent = [contrib.summary, contrib.details].filter(Boolean).join("\n\n") || "Contribution migrée";

        const { data: fact, error: factErr } = await supabase
          .from("facts")
          .insert({
            event_id: event.id,
            contributor_id: contributorId,
            content: factContent,
            face: contributorFace,
            proof_tier: "declaration",
            moderation_status: "approved",
            is_anonymous: contrib.is_anonymous ?? false,
          })
          .select("id")
          .single();

        if (factErr) throw factErr;
        summary.facts_created++;

        // Step 4a: Migrate documents as evidence
        if (contrib.vin_contribution_id) {
          const { data: docs } = await supabase
            .from("contribution_documents")
            .select("*")
            .eq("contribution_id", contrib.vin_contribution_id);

          if (docs && docs.length > 0) {
            for (const doc of docs) {
              const { error: evErr } = await supabase.from("evidence").insert({
                fact_id: fact.id,
                evidence_type: mapEvidenceType(doc.file_type),
                file_path: doc.file_path,
                file_name: doc.file_name,
                file_type: doc.file_type || "application/octet-stream",
                file_size: doc.file_size,
                description: doc.description,
                is_redacted: doc.is_redacted ?? false,
              });
              if (!evErr) summary.evidence_created++;
            }
          }

          // Step 4b: Migrate photos as evidence
          const { data: photos } = await supabase
            .from("contribution_photos")
            .select("*")
            .eq("contribution_id", contrib.vin_contribution_id);

          if (photos && photos.length > 0) {
            for (const photo of photos) {
              const { error: evErr } = await supabase.from("evidence").insert({
                fact_id: fact.id,
                evidence_type: "photo",
                file_path: photo.file_path,
                file_name: photo.file_name,
                file_type: "image/jpeg",
                description: photo.caption,
              });
              if (!evErr) summary.evidence_created++;
            }
          }
        }

        // Mark as migrated
        await supabase
          .from("public_contributions")
          .update({ migrated_at: new Date().toISOString() })
          .eq("id", contrib.id);

        // Also mark the raw contribution if it exists
        if (contrib.vin_contribution_id) {
          await supabase
            .from("raw_contributions")
            .update({ migrated_at: new Date().toISOString() })
            .eq("id", contrib.vin_contribution_id);
        }

        migratedVinIds.add(contrib.vin_id);
      } catch (err) {
        summary.errors.push(`Contribution ${contrib.id}: ${String(err)}`);
      }
    }

    // Step 5: Migrate observed signals to red flags
    const { data: signals } = await supabase
      .from("observed_signals")
      .select("*");

    if (signals && signals.length > 0) {
      for (const signal of signals) {
        const { data: existingFlag } = await supabase
          .from("red_flags")
          .select("id")
          .eq("vin_id", signal.vin_id)
          .eq("title", signal.signal_text)
          .maybeSingle();

        if (!existingFlag) {
          const { error: rfErr } = await supabase.from("red_flags").insert({
            vin_id: signal.vin_id,
            flag_type: "other",
            severity: "medium",
            title: signal.signal_text,
            detected_at: signal.first_observed_at || signal.created_at,
            is_active: true,
          });
          if (!rfErr) summary.red_flags_created++;
        }
        migratedVinIds.add(signal.vin_id);
      }
    }

    // Step 6: Refresh scores for all migrated VINs
    for (const vinId of migratedVinIds) {
      await supabase.rpc("refresh_vin_scores", { p_vin_id: vinId }).catch(() => {});
    }

    return new Response(JSON.stringify({ ...summary, message: "Migration terminée." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ...summary, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
