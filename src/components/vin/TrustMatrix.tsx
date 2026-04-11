import { useState } from "react";
import { Shield, AlertTriangle, Users, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TrustQuadrant } from "@/hooks/useVinDossier";

interface TrustMatrixProps {
  communityScore: number;
  ownerTransparency: number;
  quadrant: TrustQuadrant;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  variant?: "bars" | "quadrant";
}

const QUADRANT_CONFIG: Record<
  TrustQuadrant,
  {
    label: string;
    tooltip: string;
    color: string;
    icon: typeof Shield;
  }
> = {
  convergent: {
    label: "Dossier convergent",
    tooltip:
      "La communauté et le propriétaire convergent sur l'historique",
    color: "text-[hsl(152,69%,38%)]",
    icon: Shield,
  },
  owner_monologue: {
    label: "Monologue propriétaire",
    tooltip:
      "Seul le propriétaire a contribué — pas de vérification externe",
    color: "text-[hsl(38,92%,50%)]",
    icon: AlertTriangle,
  },
  community_dossier: {
    label: "Dossier communautaire",
    tooltip:
      "La communauté a documenté ce véhicule mais le propriétaire n'a pas contribué",
    color: "text-[hsl(224,78%,47%)]",
    icon: Users,
  },
  to_build: {
    label: "Dossier à construire",
    tooltip:
      "Peu d'informations disponibles — soyez le premier à contribuer",
    color: "text-muted-foreground",
    icon: HelpCircle,
  },
};

const SIZE_MAP = {
  sm: { bar: "h-1.5", gap: "gap-2", text: "text-[10px]", icon: 12, grid: 80 },
  md: { bar: "h-2", gap: "gap-3", text: "text-[11px]", icon: 14, grid: 120 },
  lg: { bar: "h-2.5", gap: "gap-3", text: "text-xs", icon: 16, grid: 160 },
};

function barColor(value: number, axis: "community" | "owner") {
  if (value >= 70)
    return "bg-[hsl(152,69%,38%)]";
  if (value >= 50)
    return axis === "community"
      ? "bg-[hsl(224,78%,47%)]"
      : "bg-[hsl(38,92%,50%)]";
  if (value >= 25)
    return axis === "community"
      ? "bg-[hsl(224,78%,47%,0.5)]"
      : "bg-[hsl(38,92%,50%,0.5)]";
  return "bg-muted-foreground/30";
}

// ── Variant A: Dual Bars ──
function DualBars({
  communityScore,
  ownerTransparency,
  s,
}: {
  communityScore: number;
  ownerTransparency: number;
  s: (typeof SIZE_MAP)["md"];
}) {
  return (
    <div className={`${s.gap} flex flex-col w-full`}>
      {/* Community */}
      <div>
        <div className={`flex justify-between ${s.text} mb-1`}>
          <span className="text-muted-foreground">Confiance communautaire</span>
          <span className="font-mono font-semibold text-foreground">
            {communityScore}%
          </span>
        </div>
        <div
          className={`${s.bar} rounded-full bg-muted overflow-hidden`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(communityScore, "community")}`}
            style={{ width: `${communityScore}%` }}
          />
        </div>
      </div>
      {/* Owner */}
      <div>
        <div className={`flex justify-between ${s.text} mb-1`}>
          <span className="text-muted-foreground">
            Transparence propriétaire
          </span>
          <span className="font-mono font-semibold text-foreground">
            {ownerTransparency}%
          </span>
        </div>
        <div
          className={`${s.bar} rounded-full bg-muted overflow-hidden`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(ownerTransparency, "owner")}`}
            style={{ width: `${ownerTransparency}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Variant B: Quadrant Dot ──
const QUADRANT_LABELS: { label: string; x: "left" | "right"; y: "top" | "bottom" }[] = [
  { label: "Dossier\ncommunautaire", x: "left", y: "top" },
  { label: "Dossier\nconvergent", x: "right", y: "top" },
  { label: "À\nconstruire", x: "left", y: "bottom" },
  { label: "Monologue\npropriétaire", x: "right", y: "bottom" },
];

function QuadrantDot({
  communityScore,
  ownerTransparency,
  quadrant,
  gridSize,
  textSize,
}: {
  communityScore: number;
  ownerTransparency: number;
  quadrant: TrustQuadrant;
  gridSize: number;
  textSize: string;
}) {
  const dotX = (communityScore / 100) * 100;
  const dotY = 100 - (ownerTransparency / 100) * 100;

  const activeIdx =
    quadrant === "community_dossier"
      ? 0
      : quadrant === "convergent"
        ? 1
        : quadrant === "to_build"
          ? 2
          : 3;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative border border-border rounded-lg overflow-hidden"
        style={{ width: gridSize, height: gridSize }}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 border-r border-dashed border-border" />
          <div className="flex-1" />
        </div>
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 border-b border-dashed border-border" />
          <div className="flex-1" />
        </div>

        {/* Quadrant labels */}
        {QUADRANT_LABELS.map((q, i) => (
          <span
            key={i}
            className={`absolute ${textSize} leading-tight whitespace-pre-line ${
              i === activeIdx
                ? "text-foreground/60 font-medium"
                : "text-muted-foreground/30"
            } ${q.y === "top" ? "top-1.5" : "bottom-1.5"} ${
              q.x === "left" ? "left-1.5" : "right-1.5 text-right"
            }`}
          >
            {q.label}
          </span>
        ))}

        {/* Dot */}
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md transition-all duration-500"
          style={{
            left: `calc(${dotX}% - 6px)`,
            top: `calc(${dotY}% - 6px)`,
            backgroundColor:
              quadrant === "convergent"
                ? "hsl(152,69%,38%)"
                : quadrant === "owner_monologue"
                  ? "hsl(38,92%,50%)"
                  : quadrant === "community_dossier"
                    ? "hsl(224,78%,47%)"
                    : "hsl(215,16%,47%)",
          }}
        />

        {/* Axis labels */}
        <span
          className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 ${textSize} text-muted-foreground/50`}
        >
          Communauté →
        </span>
        <span
          className={`absolute left-0.5 top-1/2 -translate-y-1/2 -rotate-90 ${textSize} text-muted-foreground/50 whitespace-nowrap`}
        >
          Propriétaire →
        </span>
      </div>
    </div>
  );
}

// ── Main Component ──
export function TrustMatrix({
  communityScore,
  ownerTransparency,
  quadrant,
  size = "md",
  showLabels = true,
  variant = "bars",
}: TrustMatrixProps) {
  const config = QUADRANT_CONFIG[quadrant];
  const Icon = config.icon;
  const s = SIZE_MAP[size];

  return (
    <TooltipProvider>
      <div className="w-full">
        {variant === "bars" ? (
          <DualBars
            communityScore={communityScore}
            ownerTransparency={ownerTransparency}
            s={s}
          />
        ) : (
          <QuadrantDot
            communityScore={communityScore}
            ownerTransparency={ownerTransparency}
            quadrant={quadrant}
            gridSize={s.grid}
            textSize={s.text}
          />
        )}

        {showLabels && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center gap-1.5 mt-2.5 cursor-help ${s.text}`}
              >
                <Icon className={config.color} size={s.icon} />
                <span className={`font-semibold ${config.color}`}>
                  {config.label}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[240px] text-xs"
            >
              {config.tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
