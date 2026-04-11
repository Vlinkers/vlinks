import { useState } from "react";
import {
  AlertTriangle, Gauge, FileX, Droplets, Car, Lock,
  AlertOctagon, Recycle, GitBranch, Search, ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import type { RedFlag } from "@/hooks/useVinDossier";

interface RedFlagsBannerProps {
  redFlags: RedFlag[];
  onFlagClick?: (flagId: string) => void;
}

const FLAG_ICONS: Record<string, typeof AlertTriangle> = {
  odometer_rollback: Gauge,
  title_wash: FileX,
  flood_damage: Droplets,
  frame_damage: Car,
  stolen: Lock,
  lemon: AlertOctagon,
  salvage_rebuilt: Recycle,
  inconsistent_history: GitBranch,
  suspicious_listing: Search,
  other: AlertTriangle,
};

const FLAG_LABELS: Record<string, string> = {
  odometer_rollback: "Recul d'odomètre",
  title_wash: "Lavage de titre",
  flood_damage: "Dommage d'inondation",
  frame_damage: "Dommage structural",
  stolen: "Véhicule volé",
  lemon: "Véhicule citron",
  salvage_rebuilt: "Reconstruit après perte totale",
  inconsistent_history: "Historique incohérent",
  suspicious_listing: "Annonce suspecte",
  other: "Autre alerte",
};

const SEVERITY: Record<string, { label: string; classes: string }> = {
  critical: { label: "CRITIQUE", classes: "bg-[hsl(0,72%,51%)] text-white" },
  high: { label: "ÉLEVÉ", classes: "bg-[hsl(24,95%,53%)] text-white" },
  medium: { label: "MOYEN", classes: "bg-[hsl(45,93%,47%,0.15)] text-[hsl(45,93%,47%)]" },
  low: { label: "FAIBLE", classes: "bg-muted text-muted-foreground" },
};

function FlagCard({
  flag,
  onClick,
}: {
  flag: RedFlag;
  onClick?: () => void;
}) {
  const Icon = FLAG_ICONS[flag.flag_type] || AlertTriangle;
  const sev = SEVERITY[flag.severity] || SEVERITY.medium;
  const desc = flag.description
    ? flag.description.length > 80
      ? flag.description.slice(0, 80) + "…"
      : flag.description
    : null;

  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg border border-[hsl(0,72%,51%,0.15)] bg-white p-3 text-left hover:border-[hsl(0,72%,51%,0.3)] hover:shadow-sm transition-all w-full"
    >
      <div className="w-8 h-8 rounded-md bg-[hsl(0,72%,51%,0.08)] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[hsl(0,72%,51%)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">
            {FLAG_LABELS[flag.flag_type] || flag.title}
          </span>
          <Badge className={`text-[10px] px-1.5 py-0 h-4 font-semibold ${sev.classes}`}>
            {sev.label}
          </Badge>
        </div>
        {desc && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {desc}
          </p>
        )}
      </div>
    </button>
  );
}

export function RedFlagsBanner({ redFlags, onFlagClick }: RedFlagsBannerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);

  if (redFlags.length === 0) return null;

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
      {redFlags.map((flag) => (
        <FlagCard
          key={flag.id}
          flag={flag}
          onClick={() => onFlagClick?.(flag.id)}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-gradient-to-r from-[hsl(0,86%,97%)] to-[hsl(33,100%,96%)] border-b border-[hsl(0,72%,51%,0.12)] border-l-4 border-l-[hsl(0,72%,51%)]">
      <div className="max-w-5xl mx-auto px-4 py-3">
        {isMobile ? (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[hsl(0,72%,51%)]" />
                <span className="text-sm font-semibold text-[hsl(0,72%,51%)]">
                  Alertes actives ({redFlags.length})
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[hsl(0,72%,51%)] transition-transform ${open ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>{content}</CollapsibleContent>
          </Collapsible>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[hsl(0,72%,51%)]" />
              <span className="text-sm font-semibold text-[hsl(0,72%,51%)]">
                Alertes actives ({redFlags.length})
              </span>
            </div>
            {content}
            {onFlagClick && (
              <button
                onClick={() => onFlagClick(redFlags[0].id)}
                className="mt-3 text-xs font-medium text-[hsl(0,72%,51%)] hover:underline"
              >
                Voir les détails ↓
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
