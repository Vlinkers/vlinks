import { useEffect, useMemo, useState } from "react";
import { Gauge, UserCircle2, DollarSign, ClipboardCheck } from "lucide-react";
import { MileageCurve, type TimelineMarker } from "@/components/vin/MileageCurve";
import { supabase } from "@/integrations/supabase/client";
import type { VinDossier, Contributor } from "@/hooks/useVinDossier";

interface MileageViewProps {
  dossier: VinDossier | null | undefined;
}

const ROLE_LABELS: Record<string, string> = {
  owner_verified: "Propriétaire vérifié",
  owner_unverified: "Propriétaire",
  former_owner: "Ancien propriétaire",
  buyer: "Acheteur",
  mechanic: "Mécanicien",
  inspector: "Inspecteur",
  dealer: "Concessionnaire",
  witness: "Témoin",
  anonymous: "Anonyme",
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function contributorLabel(c: Contributor | null) {
  if (!c) return "Anonyme";
  if (c.is_anonymous) return "Anonyme";
  return c.display_name || ROLE_LABELS[c.role] || "Contributeur";
}

interface PublicContribRow {
  id: string;
  contribution_type: string;
  intervention_date: string | null;
  asking_price: number | null;
}

export function MileageView({ dossier }: MileageViewProps) {
  const [extraMarkers, setExtraMarkers] = useState<TimelineMarker[]>([]);
  const [ownerChangeCount, setOwnerChangeCount] = useState(0);

  const vinId = dossier?.vin.id;

  // Fetch public_contributions to enrich timeline (ownership_change, for_sale, price_change, inspection_report)
  useEffect(() => {
    if (!vinId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("public_contributions")
        .select("id, contribution_type, intervention_date, asking_price")
        .eq("vin_id", vinId)
        .eq("status", "approved");
      if (cancelled || !data) return;

      const rows = data as PublicContribRow[];
      const markers: TimelineMarker[] = [];
      let owners = 0;

      for (const r of rows) {
        if (!r.intervention_date) continue;
        const ts = new Date(r.intervention_date).getTime();
        if (Number.isNaN(ts)) continue;

        if (r.contribution_type === "ownership_change") {
          owners += 1;
          markers.push({
            id: `owner-${r.id}`,
            ts,
            kind: "ownership",
            label: `Changement de propriétaire — ${formatDate(r.intervention_date)}`,
          });
        }

        if (r.asking_price != null && r.asking_price > 0) {
          markers.push({
            id: `price-${r.id}`,
            ts,
            kind: "price",
            label: `Prix déclaré : ${r.asking_price.toLocaleString("fr-CA")} $ — ${formatDate(r.intervention_date)}`,
            value: r.asking_price,
          });
        }

        if (r.contribution_type === "inspection_report") {
          markers.push({
            id: `insp-${r.id}`,
            ts,
            kind: "inspection",
            label: `Rapport d'inspection — ${formatDate(r.intervention_date)}`,
          });
        }
      }

      // Also add inspection events from the events table
      if (dossier) {
        for (const ewf of dossier.events) {
          if (ewf.event.event_type !== "inspection" || !ewf.event.event_date) continue;
          const ts = new Date(ewf.event.event_date).getTime();
          if (Number.isNaN(ts)) continue;
          markers.push({
            id: `insp-ev-${ewf.event.id}`,
            ts,
            kind: "inspection",
            label: `Rapport d'inspection — ${formatDate(ewf.event.event_date)}`,
          });
        }
      }

      setExtraMarkers(markers);
      setOwnerChangeCount(owners);
    })();
    return () => { cancelled = true; };
  }, [vinId, dossier]);

  const readings = useMemo(() => {
    if (!dossier) return [];
    const out: { id: string; date: string | null; mileage: number; contributor: Contributor | null }[] = [];
    for (const ewf of dossier.events) {
      if (ewf.event.mileage_at_event == null) continue;
      const firstContributor = ewf.facts[0]?.contributor ?? null;
      out.push({
        id: ewf.event.id,
        date: ewf.event.event_date,
        mileage: ewf.event.mileage_at_event,
        contributor: firstContributor,
      });
    }
    out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return out;
  }, [dossier]);

  if (!dossier || readings.length === 0) {
    return (
      <div className="animate-in fade-in duration-200">
        <header className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Kilométrage</h2>
        </header>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Gauge className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucun relevé de kilométrage disponible.
          </p>
        </div>
      </div>
    );
  }

  const inspectionCount = extraMarkers.filter((m) => m.kind === "inspection").length;
  const priceCount = extraMarkers.filter((m) => m.kind === "price").length;

  return (
    <div className="animate-in fade-in duration-200 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-foreground">Kilométrage</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {readings.length} relevé{readings.length > 1 ? "s" : ""} · {ownerChangeCount} propriétaire{ownerChangeCount > 1 ? "s" : ""} déclaré{ownerChangeCount > 1 ? "s" : ""}
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4" style={{ maxHeight: 460 }}>
        <MileageCurve
          events={dossier.events}
          phases={dossier.phases}
          redFlags={dossier.redFlags}
          markers={extraMarkers}
        />
      </div>

      {/* Timeline legend */}
      {(extraMarkers.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground px-1">
          {ownerChangeCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[hsl(262,60%,55%)] inline-block" />
              <UserCircle2 className="w-3.5 h-3.5" />
              Changement de propriétaire ({ownerChangeCount})
            </span>
          )}
          {priceCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[hsl(32,95%,52%)] inline-block" />
              <DollarSign className="w-3.5 h-3.5" />
              Prix déclaré ({priceCount})
            </span>
          )}
          {inspectionCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
              <ClipboardCheck className="w-3.5 h-3.5" />
              Rapport d'inspection ({inspectionCount})
            </span>
          )}
        </div>
      )}

      <div>
        <h3 className="font-display text-base font-semibold text-foreground mb-3">Relevés</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                <th className="text-right px-4 py-2.5 font-semibold">Kilométrage</th>
                <th className="text-left px-4 py-2.5 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {readings.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-foreground">{formatDate(r.date)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">
                    {r.mileage.toLocaleString("fr-CA")} km
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{contributorLabel(r.contributor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
