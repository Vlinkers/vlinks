import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MileageReading {
  id: string;
  event_date: string;
  mileage_at_event: number;
}

interface RedFlagInsert {
  vin_id: string;
  flag_type: string;
  severity: string;
  title: string;
  description: string;
  supporting_facts: string[];
  is_active: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { vin_id } = await req.json();
    if (!vin_id) {
      return new Response(JSON.stringify({ error: "vin_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all events with mileage, ordered by date
    const { data: events, error: evErr } = await supabase
      .from("events")
      .select("id, event_date, mileage_at_event")
      .eq("vin_id", vin_id)
      .not("mileage_at_event", "is", null)
      .not("event_date", "is", null)
      .order("event_date", { ascending: true });

    if (evErr) throw evErr;

    const readings: MileageReading[] = (events || []).filter(
      (e: any) => e.mileage_at_event != null && e.event_date != null
    );

    if (readings.length < 2) {
      // Check suspicious low mileage with single reading
      if (readings.length === 1) {
        const flags = await checkLowMileage(supabase, vin_id, readings[0]);
        return new Response(JSON.stringify({ flags_created: flags }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ flags_created: 0, message: "Not enough data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing active flags for this VIN to avoid duplicates
    const { data: existingFlags } = await supabase
      .from("red_flags")
      .select("id, flag_type, title")
      .eq("vin_id", vin_id)
      .eq("is_active", true);

    const activeFlags = existingFlags || [];
    const newFlags: RedFlagInsert[] = [];

    // Analyze consecutive pairs
    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1];
      const curr = readings[i];
      const diff = curr.mileage_at_event - prev.mileage_at_event;
      const daysBetween = Math.max(
        1,
        (new Date(curr.event_date).getTime() - new Date(prev.event_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // a. ROLLBACK
      if (diff < 0) {
        const absDiff = Math.abs(diff);
        const severity =
          absDiff > 10000 ? "critical" : absDiff > 1000 ? "high" : "medium";
        const title = `Recul d'odometre detecte: ${prev.mileage_at_event} km → ${curr.mileage_at_event} km`;

        if (!activeFlags.some((f) => f.flag_type === "odometer_rollback" && f.title === title)) {
          newFlags.push({
            vin_id,
            flag_type: "odometer_rollback",
            severity,
            title,
            description: `Releve precedent: ${prev.mileage_at_event} km le ${prev.event_date}. Nouveau releve: ${curr.mileage_at_event} km le ${curr.event_date}. Difference: -${absDiff} km.`,
            supporting_facts: [],
            is_active: true,
          });
        }
      }

      // b. ABNORMAL JUMP
      if (diff > 0) {
        const expectedIncrease = daysBetween * (20000 / 365);
        if (diff > expectedIncrease * 3 && diff > 30000) {
          const title = `Saut kilometrique anormal: +${diff} km en ${Math.round(daysBetween)} jours`;
          if (
            !activeFlags.some(
              (f) => f.flag_type === "inconsistent_history" && f.title === title
            )
          ) {
            newFlags.push({
              vin_id,
              flag_type: "inconsistent_history",
              severity: "medium",
              title,
              description: `De ${prev.mileage_at_event} km (${prev.event_date}) a ${curr.mileage_at_event} km (${curr.event_date}). Augmentation attendue: ~${Math.round(expectedIncrease)} km.`,
              supporting_facts: [],
              is_active: true,
            });
          }
        }
      }
    }

    // c. SUSPICIOUS LOW MILEAGE - check with latest reading
    const lowMileageFlags = await checkLowMileage(supabase, vin_id, readings[readings.length - 1], activeFlags);

    // Insert all new flags
    const allFlags = [...newFlags];
    if (lowMileageFlags) allFlags.push(lowMileageFlags);

    let inserted = 0;
    if (allFlags.length > 0) {
      const { error: insertErr, data: insertedData } = await supabase
        .from("red_flags")
        .insert(allFlags)
        .select("id");
      if (insertErr) throw insertErr;
      inserted = insertedData?.length || 0;
    }

    return new Response(
      JSON.stringify({ flags_created: inserted, flags_analyzed: readings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function checkLowMileage(
  supabase: any,
  vin_id: string,
  latestReading: MileageReading,
  existingFlags: any[] = []
): Promise<RedFlagInsert | null> {
  // Get vehicle year
  const { data: vin } = await supabase
    .from("vins")
    .select("year")
    .eq("id", vin_id)
    .single();

  if (!vin?.year) return null;

  const vehicleAge = new Date().getFullYear() - vin.year;
  if (vehicleAge > 5 && latestReading.mileage_at_event < vehicleAge * 5000) {
    const title = "Kilometrage anormalement bas pour l'age du vehicule";
    if (existingFlags.some((f) => f.flag_type === "inconsistent_history" && f.title === title)) {
      return null;
    }
    return {
      vin_id,
      flag_type: "inconsistent_history",
      severity: "low",
      title,
      description: `Vehicule de ${vehicleAge} ans avec seulement ${latestReading.mileage_at_event} km (attendu: ~${vehicleAge * 15000} km).`,
      supporting_facts: [],
      is_active: true,
    };
  }
  return null;
}
