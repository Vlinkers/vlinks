// TEMPORARY ADMIN TOOL — remove after data cleanup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  vin: string;
  source_user_id: string;
  destination_user_id: string;
  mode: "preview" | "execute";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify admin role
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Accès admin requis" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: Body = await req.json();
    const { vin, source_user_id, destination_user_id, mode } = body;
    if (!vin || !source_user_id || !destination_user_id || source_user_id === destination_user_id) {
      return new Response(JSON.stringify({ error: "Paramètres invalides" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve VIN id
    const { data: vinRow, error: vinErr } = await admin
      .from("vins")
      .select("id, vin")
      .eq("vin", vin.trim().toUpperCase())
      .maybeSingle();
    if (vinErr || !vinRow) {
      return new Response(JSON.stringify({ error: `VIN introuvable: ${vin}` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const vinId = vinRow.id as string;

    // Source contributor for this VIN
    const { data: srcContrib } = await admin
      .from("contributors")
      .select("id, role, display_name, facts_count")
      .eq("vin_id", vinId)
      .eq("user_id", source_user_id)
      .maybeSingle();

    // Destination contributor for this VIN (may not exist yet)
    const { data: dstContrib } = await admin
      .from("contributors")
      .select("id, role, display_name, facts_count")
      .eq("vin_id", vinId)
      .eq("user_id", destination_user_id)
      .maybeSingle();

    // Inventory
    const [pubC, rawC, vinC, factsC, evCreatedC] = await Promise.all([
      admin.from("public_contributions").select("id, title, contribution_type, status, created_at").eq("vin_id", vinId).eq("user_id", source_user_id),
      admin.from("raw_contributions").select("id, title, contribution_type, created_at").eq("vin_id", vinId).eq("user_id", source_user_id),
      admin.from("vin_contributions").select("id, title, contribution_type, created_at").eq("vin_id", vinId).eq("user_id", source_user_id),
      srcContrib ? admin.from("facts").select("id, content, created_at").eq("contributor_id", srcContrib.id) : Promise.resolve({ data: [], error: null } as any),
      // verifications by source user on this VIN
      admin.from("owner_verifications").select("id, verification_status, created_at").eq("vin_id", vinId).eq("user_id", source_user_id),
    ]);

    const inventory = {
      vin: vinRow.vin,
      vin_id: vinId,
      source_user_id,
      destination_user_id,
      source_contributor: srcContrib ?? null,
      destination_contributor: dstContrib ?? null,
      public_contributions: pubC.data ?? [],
      raw_contributions: rawC.data ?? [],
      vin_contributions: vinC.data ?? [],
      facts: factsC.data ?? [],
      owner_verifications: evCreatedC.data ?? [],
    };

    if (mode === "preview") {
      return new Response(JSON.stringify({ ok: true, mode, inventory }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // EXECUTE
    const result: Record<string, number> = {
      public_contributions: 0,
      raw_contributions: 0,
      vin_contributions: 0,
      facts_reassigned: 0,
      owner_verifications: 0,
      contributor_merged: 0,
    };

    // 1. Reassign user_id on contribution tables for this VIN
    const upd = async (table: string) => {
      const { data, error } = await admin
        .from(table)
        .update({ user_id: destination_user_id })
        .eq("vin_id", vinId)
        .eq("user_id", source_user_id)
        .select("id");
      if (error) throw new Error(`${table}: ${error.message}`);
      return data?.length ?? 0;
    };
    result.public_contributions = await upd("public_contributions");
    result.raw_contributions = await upd("raw_contributions");
    result.vin_contributions = await upd("vin_contributions");

    // 2. Reassign owner_verifications
    {
      const { data, error } = await admin
        .from("owner_verifications")
        .update({ user_id: destination_user_id })
        .eq("vin_id", vinId)
        .eq("user_id", source_user_id)
        .select("id");
      if (error) throw new Error(`owner_verifications: ${error.message}`);
      result.owner_verifications = data?.length ?? 0;
    }

    // 3. Move facts from source contributor → destination contributor
    if (srcContrib) {
      let dstId = dstContrib?.id;
      if (!dstId) {
        // Create destination contributor row
        const { data: prof } = await admin
          .from("profiles")
          .select("username, display_name")
          .eq("user_id", destination_user_id)
          .maybeSingle();
        const { data: created, error: createErr } = await admin
          .from("contributors")
          .insert({
            vin_id: vinId,
            user_id: destination_user_id,
            role: srcContrib.role,
            display_name: prof?.username ?? prof?.display_name ?? null,
            is_anonymous: false,
          } as any)
          .select("id")
          .single();
        if (createErr) throw new Error(`contributors insert: ${createErr.message}`);
        dstId = created!.id;
      }

      const { data: factsUpd, error: factsErr } = await admin
        .from("facts")
        .update({ contributor_id: dstId })
        .eq("contributor_id", srcContrib.id)
        .select("id");
      if (factsErr) throw new Error(`facts: ${factsErr.message}`);
      result.facts_reassigned = factsUpd?.length ?? 0;

      // Delete now-empty source contributor row
      const { error: delErr } = await admin.from("contributors").delete().eq("id", srcContrib.id);
      if (!delErr) result.contributor_merged = 1;
    }

    // 4. Audit log
    await admin.from("admin_audit_log").insert({
      admin_user_id: userData.user.id,
      action_type: "reassign_contributions",
      target_type: "vin",
      target_id: vinId,
      details: {
        vin: vinRow.vin,
        source_user_id,
        destination_user_id,
        result,
      } as any,
    });

    return new Response(JSON.stringify({ ok: true, mode, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("admin-reassign-contributions error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
