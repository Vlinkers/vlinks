import { useMemo } from "react";
import { Gauge } from "lucide-react";
import { MileageCurve } from "@/components/vin/MileageCurve";
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

export function MileageView({ dossier }: MileageViewProps) {
  const readings = useMemo(() => {
    if (!dossier) return [];
    const out: { id: string; date: string | null; mileage: number; contributor: Contributor | null }[] = [];
    for (const ewf of dossier.events) {
      if (ewf.event.mileage_at_event == null) continue;
      // pick first contributor as source (the one who logged the event/fact)
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

  return (
    <div className="animate-in fade-in duration-200 space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-foreground">Kilométrage</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {readings.length} relevé{readings.length > 1 ? "s" : ""} enregistré{readings.length > 1 ? "s" : ""}
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4" style={{ maxHeight: 420 }}>
        <MileageCurve
          events={dossier.events}
          phases={dossier.phases}
          redFlags={dossier.redFlags}
        />
      </div>

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
