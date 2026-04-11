import { MessageCircle, FileText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Enums } from "@/integrations/supabase/types";

export type ProofTier = Enums<"proof_tier">;

interface ProofTierBadgeProps {
  tier: ProofTier;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  showTooltip?: boolean;
}

const CONFIG: Record<
  ProofTier,
  {
    label: string;
    tooltip: string;
    icon: typeof MessageCircle;
    filled: number;
    text: string;
    bg: string;
    dot: string;
    dotEmpty: string;
  }
> = {
  declaration: {
    label: "Déclaration",
    tooltip: "Affirmation sans pièce justificative",
    icon: MessageCircle,
    filled: 1,
    text: "text-muted-foreground",
    bg: "bg-muted/60 border-border",
    dot: "bg-muted-foreground",
    dotEmpty: "bg-muted-foreground/20",
  },
  documented: {
    label: "Documenté",
    tooltip: "Appuyé par un document ou une photo",
    icon: FileText,
    filled: 2,
    text: "text-[hsl(224,78%,47%)]",
    bg: "bg-[hsl(226,100%,97%)] border-[hsl(224,78%,47%,0.2)]",
    dot: "bg-[hsl(224,78%,47%)]",
    dotEmpty: "bg-[hsl(224,78%,47%,0.2)]",
  },
  verified: {
    label: "Vérifié",
    tooltip:
      "Confirmé par un document officiel vérifiable (facture, rapport, certificat)",
    icon: ShieldCheck,
    filled: 3,
    text: "text-[hsl(152,69%,38%)]",
    bg: "bg-[hsl(152,69%,95%)] border-[hsl(152,69%,38%,0.2)]",
    dot: "bg-[hsl(152,69%,38%)]",
    dotEmpty: "bg-[hsl(152,69%,38%,0.2)]",
  },
};

const SIZES = {
  xs: { badge: "px-1.5 py-0 h-5 text-[10px] gap-1", icon: 12, dot: "w-1 h-1" },
  sm: { badge: "px-2 py-0.5 h-6 text-[11px] gap-1.5", icon: 14, dot: "w-1.5 h-1.5" },
  md: { badge: "px-2.5 py-1 h-7 text-xs gap-1.5", icon: 16, dot: "w-1.5 h-1.5" },
};

export function getProofTierLabel(tier: ProofTier): string {
  return CONFIG[tier].label;
}

export function getProofTierColor(tier: ProofTier): string {
  return CONFIG[tier].text;
}

export function ProofTierBadge({
  tier,
  size = "sm",
  showLabel = true,
  showTooltip = true,
}: ProofTierBadgeProps) {
  const c = CONFIG[tier];
  const s = SIZES[size];
  const Icon = c.icon;

  const dots = (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`${s.dot} rounded-full ${i < c.filled ? c.dot : c.dotEmpty}`}
        />
      ))}
    </span>
  );

  const badge = (
    <Badge
      variant="outline"
      className={`inline-flex items-center font-medium ${s.badge} ${c.bg} ${c.text} border`}
    >
      <Icon size={s.icon} className="flex-shrink-0" />
      {showLabel && <span>{c.label}</span>}
      {dots}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {c.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
