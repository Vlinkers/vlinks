import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

// ── Core types ──────────────────────────────────────────────

export type Vin = Tables<"vins">;
export type Event = Tables<"events">;
export type Fact = Tables<"facts">;
export type Evidence = Tables<"evidence">;
export type Contributor = Tables<"contributors">;
export type VehiclePhase = Tables<"vehicle_phases">;
export type RedFlag = Tables<"red_flags">;

export interface Vehicle {
  make: string | null;
  model: string | null;
  year: number | null;
  body_class: string | null;
  engine: string | null;
  fuel_type: string | null;
  drive_type: string | null;
  trim: string | null;
}

export interface FactWithEvidence {
  fact: Fact;
  evidence: Evidence[];
  contributor: Contributor | null;
}

export interface EventWithFacts {
  event: Event;
  facts: FactWithEvidence[];
}

export type TrustQuadrant =
  | "convergent"
  | "owner_monologue"
  | "community_dossier"
  | "to_build";

export interface DossierStats {
  totalEvents: number;
  totalFacts: number;
  faceAFacts: number;
  faceBFacts: number;
  verifiedFacts: number;
  documentedFacts: number;
  declarationFacts: number;
  activeRedFlags: number;
  uniqueContributors: number;
  communityScore: number;
  ownerTransparency: number;
}

export interface VinDossier {
  vin: Vin;
  vehicle: Vehicle;
  events: EventWithFacts[];
  phases: VehiclePhase[];
  redFlags: RedFlag[];
  contributors: Contributor[];
  stats: DossierStats;
  trustQuadrant: TrustQuadrant;
}

// ── Fetch helpers ───────────────────────────────────────────

async function fetchDossier(vinId: string): Promise<VinDossier | null> {
  // 1. Fetch VIN record first (needed for vin_decodes lookup)
  const vinRes = await supabase.from("vins").select("*").eq("id", vinId).maybeSingle();
  if (vinRes.error) throw vinRes.error;
  if (!vinRes.data) return null;
  const vin = vinRes.data;

  // 2. Parallel queries for all related data
  const [decodeRes, eventsRes, contributorsRes, phasesRes, flagsRes] =
    await Promise.all([
      supabase
        .from("vin_decodes")
        .select("make, model, model_year, body_class, engine, fuel_type, drive_type, trim")
        .eq("vin", vin.vin)
        .maybeSingle(),
      supabase
        .from("events")
        .select("*")
        .eq("vin_id", vinId)
        .order("event_date", { ascending: false, nullsFirst: false }),
      supabase.from("contributors").select("*").eq("vin_id", vinId),
      supabase
        .from("vehicle_phases")
        .select("*")
        .eq("vin_id", vinId)
        .order("start_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("red_flags")
        .select("*")
        .eq("vin_id", vinId)
        .eq("is_active", true),
    ]);

  const events = eventsRes.data ?? [];
  const contributors = contributorsRes.data ?? [];
  const phases = phasesRes.data ?? [];
  const redFlags = flagsRes.data ?? [];

  const vehicle: Vehicle = decodeRes.data
    ? {
        make: decodeRes.data.make,
        model: decodeRes.data.model,
        year: decodeRes.data.model_year,
        body_class: decodeRes.data.body_class,
        engine: decodeRes.data.engine,
        fuel_type: decodeRes.data.fuel_type,
        drive_type: decodeRes.data.drive_type,
        trim: decodeRes.data.trim,
      }
    : {
        make: vin.make,
        model: vin.model,
        year: vin.year,
        body_class: null,
        engine: null,
        fuel_type: null,
        drive_type: null,
        trim: null,
      };

  // 2. Fetch facts for all events
  const eventIds = events.map((e) => e.id);
  let allFacts: Fact[] = [];
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from("facts")
      .select("*")
      .in("event_id", eventIds)
      .in("moderation_status", ["approved", "pending"]);
    allFacts = (data ?? []) as Fact[];
  }

  // 3. Fetch evidence for all facts
  const factIds = allFacts.map((f) => f.id);
  let allEvidence: Evidence[] = [];
  if (factIds.length > 0) {
    const { data } = await supabase
      .from("evidence")
      .select("*")
      .in("fact_id", factIds);
    allEvidence = (data ?? []) as Evidence[];
  }

  // 4. Build lookup maps
  const contributorMap = new Map(contributors.map((c) => [c.id, c]));
  const evidenceByFact = new Map<string, Evidence[]>();
  for (const e of allEvidence) {
    const arr = evidenceByFact.get(e.fact_id) || [];
    arr.push(e);
    evidenceByFact.set(e.fact_id, arr);
  }

  const factsByEvent = new Map<string, FactWithEvidence[]>();
  for (const f of allFacts) {
    const arr = factsByEvent.get(f.event_id) || [];
    arr.push({
      fact: f,
      evidence: evidenceByFact.get(f.id) || [],
      contributor: contributorMap.get(f.contributor_id) ?? null,
    });
    factsByEvent.set(f.event_id, arr);
  }

  // 5. Assemble events with nested facts
  const eventsWithFacts: EventWithFacts[] = events.map((event) => ({
    event,
    facts: factsByEvent.get(event.id) ?? [],
  }));

  // 6. Calculate stats
  const faceAFacts = allFacts.filter((f) => f.face === "face_a").length;
  const faceBFacts = allFacts.filter((f) => f.face === "face_b").length;
  const verifiedFacts = allFacts.filter((f) => f.proof_tier === "verified").length;
  const documentedFacts = allFacts.filter((f) => f.proof_tier === "documented").length;
  const declarationFacts = allFacts.filter((f) => f.proof_tier === "declaration").length;

  const uniqueContributors = new Set(
    contributors.filter((c) => !c.is_anonymous).map((c) => c.user_id)
  ).size;

  const communityScore = Math.min(
    100,
    vin.community_score ??
      Math.round(
        Math.min(faceAFacts * 10, 60) +
          Math.min(verifiedFacts * 8, 30) +
          Math.min(uniqueContributors * 5, 10)
      )
  );

  const ownerTransparency = Math.min(
    100,
    vin.owner_transparency_score ??
      Math.round(
        Math.min(faceBFacts * 12, 50) +
          (contributors.some((c) => c.role === "owner_verified") ? 40 : 0) +
          Math.min(
            allFacts.filter((f) => f.face === "face_b" && f.proof_tier === "verified").length * 5,
            10
          )
      )
  );

  const stats: DossierStats = {
    totalEvents: events.length,
    totalFacts: allFacts.length,
    faceAFacts,
    faceBFacts,
    verifiedFacts,
    documentedFacts,
    declarationFacts,
    activeRedFlags: redFlags.length,
    uniqueContributors,
    communityScore,
    ownerTransparency,
  };

  // 7. Trust quadrant
  const trustQuadrant: TrustQuadrant =
    communityScore >= 50 && ownerTransparency >= 50
      ? "convergent"
      : communityScore < 50 && ownerTransparency >= 50
        ? "owner_monologue"
        : communityScore >= 50 && ownerTransparency < 50
          ? "community_dossier"
          : "to_build";

  return {
    vin,
    vehicle,
    events: eventsWithFacts,
    phases,
    redFlags,
    contributors,
    stats,
    trustQuadrant,
  };
}

// ── Hook ────────────────────────────────────────────────────

export function useVinDossier(vinId: string | undefined) {
  return useQuery({
    queryKey: ["vin-dossier", vinId],
    queryFn: () => fetchDossier(vinId!),
    enabled: !!vinId,
    staleTime: 1000 * 60 * 2,
  });
}
