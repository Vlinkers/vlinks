import type { VehicleHealthData } from "@/hooks/useVehicleHealth";
import { CalendarClock, Gauge, ListChecks, CalendarPlus } from "lucide-react";

interface HealthKPIsProps {
  kpis: VehicleHealthData["kpis"];
}

function scoreColor(score: number): string {
  if (score >= 70) return "hsl(142, 70%, 42%)";
  if (score >= 40) return "hsl(45, 90%, 50%)";
  return "hsl(0, 75%, 55%)";
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = scoreColor(score);
  return (
    <div className="relative w-[110px] h-[110px] flex-shrink-0">
      <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
        <circle
          cx="55" cy="55" r={radius}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-display" style={{ color }}>{score}%</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Santé</span>
      </div>
    </div>
  );
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  try {
    return d.toLocaleDateString("fr-CA", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

export function HealthKPIs({ kpis }: HealthKPIsProps) {
  const next = kpis.nextScheduled;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ScoreGauge score={kpis.globalScore} />
        <div className="text-xs text-muted-foreground leading-relaxed">
          Score basé sur l'usure et la fraîcheur des entretiens documentés.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <KPIItem
          icon={<CalendarClock className="w-3.5 h-3.5" />}
          label="Dernier entretien"
          value={fmtDate(kpis.lastMaintenanceDate)}
        />
        <KPIItem
          icon={<Gauge className="w-3.5 h-3.5" />}
          label="Kilométrage"
          value={kpis.currentKm != null ? `${kpis.currentKm.toLocaleString("fr-CA")} km` : "—"}
        />
        <KPIItem
          icon={<ListChecks className="w-3.5 h-3.5" />}
          label="Systèmes documentés"
          value={`${kpis.documentedSystems} / ${kpis.totalSystems}`}
        />
        <KPIItem
          icon={<CalendarPlus className="w-3.5 h-3.5" />}
          label="Prochaine échéance"
          value={formatNext(next)}
        />
      </div>
    </div>
  );
}

function formatNext(next: HealthKPIsProps["kpis"]["nextScheduled"]): string {
  if (!next) return "—";
  const parts: string[] = [];
  if (next.date) {
    const dateStr = fmtDate(next.date);
    const days = Math.round((next.date.getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 30) parts.push(`${dateStr} (dans ${days}j)`);
    else parts.push(dateStr);
  }
  if (next.km != null) {
    parts.push(`${next.km.toLocaleString("fr-CA")} km`);
  }
  if (parts.length === 0) return next.systemLabel;
  return `${next.systemLabel} · ${parts.join(" / ")}`;
}

function KPIItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground mt-0.5 truncate" title={value}>{value}</p>
    </div>
  );
}
