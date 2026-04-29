import { Wrench, AlertTriangle, Shield, Palette, ClipboardList, Eye, EyeOff } from "lucide-react";
import {
  type MaintenanceData,
  SYSTEM_LABELS,
  SYSTEM_SCHEMAS,
  PERFORMED_BY_LABELS,
  wearColor,
  type SystemEntry,
  type VisitType,
} from "@/lib/maintenanceLogTypes";

const VISIT_ICON: Record<VisitType, { Icon: typeof Wrench; color: string; label: string }> = {
  entretien_regulier: { Icon: Wrench, color: "hsl(170,70%,35%)", label: "Entretien régulier" },
  probleme_alerte: { Icon: AlertTriangle, color: "hsl(0,75%,55%)", label: "Problème / Alerte" },
  rappel_constructeur: { Icon: Shield, color: "hsl(220,70%,50%)", label: "Rappel constructeur" },
  modification: { Icon: Palette, color: "hsl(280,60%,55%)", label: "Modification" },
  inspection_controle: { Icon: ClipboardList, color: "hsl(35,85%,45%)", label: "Inspection / Contrôle" },
};

function lookupOptionLabel(systemKey: string, optionField: string, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const schema = SYSTEM_SCHEMAS[systemKey as keyof typeof SYSTEM_SCHEMAS];
  if (!schema) return null;
  if (optionField === "intervention" && schema.intervention) {
    return schema.intervention.options.find((o) => o.value === value)?.label ?? value;
  }
  const fld = schema.fields.find((f) => f.key === optionField);
  if (fld?.options) return fld.options.find((o) => o.value === value)?.label ?? value;
  return null;
}

function WearBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-semibold" style={{ color: wearColor(pct) }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: wearColor(pct) }}
        />
      </div>
    </div>
  );
}

function SystemBlock({ entry }: { entry: SystemEntry }) {
  const sysLabel =
    entry.system === "autre" && entry.custom_label ? entry.custom_label : SYSTEM_LABELS[entry.system];
  const interventionLabel = entry.intervention_type
    ? lookupOptionLabel(entry.system, "intervention", entry.intervention_type) ?? entry.intervention_type
    : null;
  const details = (entry.details ?? {}) as Record<string, unknown>;

  // Special rich rendering for known systems
  const wearKeys: { key: string; label: string }[] = [];
  if (entry.system === "pneus") {
    if (typeof details.summer_wear_pct === "number")
      wearKeys.push({ key: "summer_wear_pct", label: `Été${details.summer_brand ? " · " + details.summer_brand : ""}` });
    if (typeof details.winter_wear_pct === "number")
      wearKeys.push({ key: "winter_wear_pct", label: `Hiver${details.winter_brand ? " · " + details.winter_brand : ""}` });
  }
  if (entry.system === "freins") {
    if (typeof details.front_pads_pct === "number")
      wearKeys.push({ key: "front_pads_pct", label: "Plaquettes avant" });
    if (typeof details.rear_pads_pct === "number")
      wearKeys.push({ key: "rear_pads_pct", label: "Plaquettes arrière" });
  }

  // Misc key-value lines
  const miscLines: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(details)) {
    if (v === null || v === undefined || v === "") continue;
    if (wearKeys.some((w) => w.key === k)) continue;
    if (k.endsWith("_brand") && entry.system === "pneus") continue;
    const opt = lookupOptionLabel(entry.system, k, v);
    if (opt) {
      miscLines.push({ label: humanizeKey(k), value: opt });
    } else if (typeof v === "string" || typeof v === "number") {
      const schema = SYSTEM_SCHEMAS[entry.system as keyof typeof SYSTEM_SCHEMAS];
      const fld = schema?.fields.find((f) => f.key === k);
      const unit = fld?.unit ? ` ${fld.unit}` : "";
      miscLines.push({ label: humanizeKey(k), value: `${v}${unit}` });
    } else if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
      const labels = v
        .map((x) => lookupOptionLabel(entry.system, k, x) ?? x)
        .join(", ");
      if (labels) miscLines.push({ label: humanizeKey(k), value: labels });
    }
  }

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-foreground leading-tight">{sysLabel}</p>
        {interventionLabel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground font-medium">
            {interventionLabel}
          </span>
        )}
      </div>
      {wearKeys.length > 0 && (
        <div className="space-y-1.5">
          {wearKeys.map((w) => (
            <WearBar key={w.key} pct={(details[w.key] as number) ?? 0} label={w.label} />
          ))}
        </div>
      )}
      {miscLines.length > 0 && (
        <ul className="text-[11px] text-muted-foreground space-y-0.5">
          {miscLines.slice(0, 4).map((l, i) => (
            <li key={i}>
              <span className="text-foreground/70">{l.label}:</span>{" "}
              <span className="font-medium text-foreground">{l.value}</span>
            </li>
          ))}
        </ul>
      )}
      {entry.mechanic_note && (
        <p className="text-[11px] italic text-muted-foreground border-l-2 border-border pl-2">
          « {entry.mechanic_note} »
        </p>
      )}
    </div>
  );
}

function humanizeKey(k: string): string {
  return k
    .replace(/_pct$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MaintenanceCardSummary({ data }: { data: MaintenanceData }) {
  const visit = VISIT_ICON[data.visit_type];
  const Icon = visit.Icon;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${visit.color}1A`, color: visit.color }}
        >
          <Icon className="w-3 h-3" />
          {visit.label}
        </span>
        {data.performed_by && (
          <span className="text-[10px] text-muted-foreground">
            · {PERFORMED_BY_LABELS[data.performed_by]}
            {data.garage_name ? ` — ${data.garage_name}` : ""}
          </span>
        )}
      </div>

      <div className="grid gap-2">
        {data.systems.map((s, i) => (
          <SystemBlock key={i} entry={s} />
        ))}
      </div>

      {(data.cost != null && data.cost > 0) && (
        <div className="flex items-center gap-1.5 text-[11px]">
          {data.cost_visible ? (
            <>
              <Eye className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Coût total:</span>
              <span className="font-semibold text-foreground tabular-nums">
                {data.cost.toLocaleString("fr-CA")} $
              </span>
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-muted-foreground/60 italic">Coût masqué par le propriétaire</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
