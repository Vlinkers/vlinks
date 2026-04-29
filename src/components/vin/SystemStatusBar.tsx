import { cn } from "@/lib/utils";
import type { SystemHealth, HealthStatus } from "@/hooks/useVehicleHealth";
import type { SystemKey } from "@/lib/maintenanceLogTypes";

const ICONS: Partial<Record<SystemKey, string>> = {
  pneus: "🛞",
  freins: "🛑",
  huile_moteur: "🛢️",
  moteur: "⚙️",
  transmission: "🔧",
  batterie: "🔋",
  suspension: "🪛",
  echappement: "💨",
  climatisation: "❄️",
  eclairage: "💡",
};

const STATUS_BG: Record<HealthStatus, string> = {
  green: "bg-green-50 border-green-300 text-green-900 hover:bg-green-100",
  yellow: "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100",
  red: "bg-red-50 border-red-300 text-red-900 hover:bg-red-100",
  grey: "bg-muted border-border text-muted-foreground hover:bg-muted/70",
};

function indicator(sh: SystemHealth): string {
  if (sh.status === "grey") return "--";
  if (sh.wearPercentage != null) return `${sh.wearPercentage}%`;
  if (sh.status === "red") return "⚠️";
  if (sh.status === "yellow") return "À surveiller";
  return "OK";
}

interface SystemStatusBarProps {
  systems: Partial<Record<SystemKey, SystemHealth>>;
  onSystemClick: (sys: SystemKey) => void;
}

export function SystemStatusBar({ systems, onSystemClick }: SystemStatusBarProps) {
  const list = Object.values(systems).filter(Boolean) as SystemHealth[];
  // Sort: documented first (non-grey), then grey
  const sorted = [...list].sort((a, b) => {
    if (a.status === "grey" && b.status !== "grey") return 1;
    if (b.status === "grey" && a.status !== "grey") return -1;
    return 0;
  });

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
      {sorted.map((sh) => (
        <button
          key={sh.system}
          type="button"
          onClick={() => onSystemClick(sh.system)}
          className={cn(
            "flex-shrink-0 flex flex-col items-center gap-1 min-w-[78px] px-3 py-2 rounded-md border transition-colors",
            STATUS_BG[sh.status]
          )}
          aria-label={`${sh.label} — ${indicator(sh)}`}
        >
          <span className="text-base leading-none">{ICONS[sh.system] ?? "🔧"}</span>
          <span className="text-[11px] font-semibold leading-tight">{sh.label}</span>
          <span className="text-[11px] font-mono">{indicator(sh)}</span>
        </button>
      ))}
    </div>
  );
}
