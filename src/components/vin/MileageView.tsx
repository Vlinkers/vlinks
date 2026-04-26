import { useEffect, useMemo, useState } from "react";
import { Gauge, UserCircle2, DollarSign, ClipboardCheck, TrendingUp } from "lucide-react";
import { MileageCurve, type TimelineMarker } from "@/components/vin/MileageCurve";
import { supabase } from "@/integrations/supabase/client";
import type { VinDossier } from "@/hooks/useVinDossier";

interface MileageViewProps {
  dossier: VinDossier | null | undefined;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function formatPrice(p: number | null | undefined) {
  if (p == null) return "—";
  return `${p.toLocaleString("fr-CA")} $`;
}

interface PublicContribRow {
  id: string;
  contribution_type: string;
  intervention_date: string | null;
  asking_price: number | null;
  mileage_at_intervention: number | null;
}

export function MileageView({ dossier }: MileageViewProps) {
  const [extraMarkers, setExtraMarkers] = useState<TimelineMarker[]>([]);
  const [contribs, setContribs] = useState<PublicContribRow[]>([]);

  const vinId = dossier?.vin.id;

  useEffect(() => {
    if (!vinId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("public_contributions")
        .select("id, contribution_type, intervention_date, asking_price, mileage_at_intervention")
        .eq("vin_id", vinId)
        .eq("status", "approved");
      if (cancelled || !data) return;

      const rows = data as PublicContribRow[];
      setContribs(rows);

      const markers: TimelineMarker[] = [];

      for (const r of rows) {
        if (!r.intervention_date) continue;
        const ts = new Date(r.intervention_date).getTime();
        if (Number.isNaN(ts)) continue;

        if (r.contribution_type === "ownership_change") {
          markers.push({
            id: `owner-${r.id}`,
            ts,
            kind: "ownership",
            label: `Changement de propriétaire — ${formatDate(r.intervention_date)}${r.mileage_at_intervention ? ` · ${r.mileage_at_intervention.toLocaleString("fr-CA")} km` : ""}`,
          });
        }

        if (r.asking_price != null && r.asking_price > 0) {
          markers.push({
            id: `price-${r.id}`,
            ts,
            kind: "price",
            label: `Prix déclaré : ${formatPrice(r.asking_price)} — ${formatDate(r.intervention_date)}`,
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

      // Events table: inspections + ownership transactions (purchase / sale)
      if (dossier) {
        for (const ewf of dossier.events) {
          if (!ewf.event.event_date) continue;
          const ts = new Date(ewf.event.event_date).getTime();
          if (Number.isNaN(ts)) continue;

          if (ewf.event.event_type === "inspection") {
            markers.push({
              id: `insp-ev-${ewf.event.id}`,
              ts,
              kind: "inspection",
              label: `Rapport d'inspection — ${formatDate(ewf.event.event_date)}`,
            });
          }

          if (ewf.event.event_type === "purchase" || ewf.event.event_type === "sale") {
            const kindLabel = ewf.event.event_type === "purchase" ? "Achat" : "Vente";
            const km = ewf.event.mileage_at_event;
            markers.push({
              id: `tx-${ewf.event.id}`,
              ts,
              kind: "ownership",
              label: `${kindLabel} — ${formatDate(ewf.event.event_date)}${km != null ? ` · ${km.toLocaleString("fr-CA")} km` : ""}`,
            });
          }
        }
      }

      setExtraMarkers(markers);
    })();
    return () => { cancelled = true; };
  }, [vinId, dossier]);

  // Mileage readings (from events with mileage_at_event)
  const readings = useMemo(() => {
    if (!dossier) return [];
    const out: { id: string; date: string | null; mileage: number }[] = [];
    for (const ewf of dossier.events) {
      if (ewf.event.mileage_at_event == null) continue;
      out.push({
        id: ewf.event.id,
        date: ewf.event.event_date,
        mileage: ewf.event.mileage_at_event,
      });
    }
    out.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    return out;
  }, [dossier]);

  // Aggregate stats
  const stats = useMemo(() => {
    const ownerChanges = extraMarkers.filter((m) => m.kind === "ownership");
    const ownerCount = ownerChanges.length;

    // Possession durations
    let avgMonths: number | null = null;
    if (ownerChanges.length >= 2) {
      const sorted = [...ownerChanges].sort((a, b) => a.ts - b.ts);
      const diffs: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        diffs.push((sorted[i].ts - sorted[i - 1].ts) / (1000 * 60 * 60 * 24 * 30.44));
      }
      avgMonths = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    }

    const firstReading = readings[0] ?? null;
    const lastReading = readings[readings.length - 1] ?? null;

    let progressionMonths: number | null = null;
    let progressionKm: number | null = null;
    if (firstReading?.date && lastReading?.date && firstReading !== lastReading) {
      progressionKm = lastReading.mileage - firstReading.mileage;
      progressionMonths = Math.max(
        1,
        Math.round((new Date(lastReading.date).getTime() - new Date(firstReading.date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      );
    }

    const prices = contribs
      .filter((c) => c.asking_price != null && c.asking_price > 0)
      .map((c) => c.asking_price as number);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;

    return {
      ownerCount,
      avgMonths,
      firstReading,
      lastReading,
      progressionKm,
      progressionMonths,
      minPrice,
      maxPrice,
      pricesCount: prices.length,
    };
  }, [extraMarkers, readings, contribs]);

  const inspectionCount = extraMarkers.filter((m) => m.kind === "inspection").length;
  const priceCount = extraMarkers.filter((m) => m.kind === "price").length;

  // Empty state
  if (!dossier || (readings.length === 0 && extraMarkers.length === 0)) {
    return (
      <div className="animate-in fade-in duration-200">
        <header className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Frise de vie</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Évolution chronologique du véhicule : kilométrage, propriétaires, prix et inspections.
          </p>
        </header>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Gauge className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucune donnée temporelle disponible pour ce véhicule.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-200 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-foreground">Frise de vie</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {readings.length} relevé{readings.length > 1 ? "s" : ""} kilométrique{readings.length > 1 ? "s" : ""}
          {stats.ownerCount > 0 && <> · {stats.ownerCount} propriétaire{stats.ownerCount > 1 ? "s" : ""} déclaré{stats.ownerCount > 1 ? "s" : ""}</>}
          {stats.avgMonths != null && <> · durée moyenne {stats.avgMonths} mois</>}
        </p>
      </header>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <MileageCurve
          events={dossier.events}
          phases={dossier.phases}
          redFlags={dossier.redFlags}
          markers={extraMarkers}
        />
      </div>

      {/* Full legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground px-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[hsl(152,44%,28%)] inline-block" />
          Kilométrage
        </span>
        {stats.ownerCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-[hsl(262,60%,55%)] inline-block" />
            <UserCircle2 className="w-3.5 h-3.5" />
            Changement de propriétaire ({stats.ownerCount})
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
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(152,60%,38%)] inline-block" />
            <ClipboardCheck className="w-3.5 h-3.5" />
            Rapport d'inspection ({inspectionCount})
          </span>
        )}
      </div>

      {/* Summary cards — only render tiles with actual data */}
      {(() => {
        const tiles: React.ReactNode[] = [];
        if (stats.ownerCount > 0) {
          tiles.push(
            <SummaryCard
              key="owners"
              icon={<UserCircle2 className="w-4 h-4 text-[hsl(262,60%,55%)]" />}
              label="Propriétaires"
              value={`${stats.ownerCount} déclaré${stats.ownerCount > 1 ? "s" : ""}`}
              hint={stats.avgMonths != null ? `Durée moyenne ${stats.avgMonths} mois` : undefined}
            />
          );
        }
        if (stats.firstReading) {
          tiles.push(
            <SummaryCard
              key="first"
              icon={<Gauge className="w-4 h-4 text-[hsl(152,44%,28%)]" />}
              label="Premier relevé"
              value={`${stats.firstReading.mileage.toLocaleString("fr-CA")} km`}
              hint={formatDate(stats.firstReading.date)}
            />
          );
        }
        if (stats.lastReading && stats.lastReading !== stats.firstReading) {
          tiles.push(
            <SummaryCard
              key="last"
              icon={<TrendingUp className="w-4 h-4 text-[hsl(152,44%,28%)]" />}
              label="Dernier relevé"
              value={`${stats.lastReading.mileage.toLocaleString("fr-CA")} km`}
              hint={
                stats.progressionKm != null && stats.progressionMonths != null
                  ? `+${stats.progressionKm.toLocaleString("fr-CA")} km sur ${stats.progressionMonths} mois`
                  : formatDate(stats.lastReading.date)
              }
            />
          );
        }
        if (stats.minPrice != null && stats.maxPrice != null) {
          tiles.push(
            <SummaryCard
              key="price"
              icon={<DollarSign className="w-4 h-4 text-[hsl(32,95%,52%)]" />}
              label="Prix observés"
              value={
                stats.minPrice === stats.maxPrice
                  ? formatPrice(stats.minPrice)
                  : `${formatPrice(stats.minPrice)} → ${formatPrice(stats.maxPrice)}`
              }
              hint={stats.pricesCount > 0 ? `${stats.pricesCount} prix déclaré${stats.pricesCount > 1 ? "s" : ""}` : undefined}
            />
          );
        }
        if (tiles.length === 0) return null;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{tiles}</div>
        );
      })()}

      {/* Mileage readings table */}
      {readings.length > 0 && (
        <div>
          <h3 className="font-display text-base font-semibold text-foreground mb-3">Relevés kilométriques</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Kilométrage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {[...readings].reverse().map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-foreground">{formatDate(r.date)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">
                      {r.mileage.toLocaleString("fr-CA")} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon, label, value, hint,
}: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-mono font-semibold text-foreground text-sm">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
