import { useState } from "react";
import {
  ShoppingCart, Tag, AlertTriangle, Wrench, Settings, ClipboardCheck,
  Paintbrush, Bell, Shield, Globe, Plane, FileText, Gauge, CircleDot,
  ChevronDown, User, Paperclip, ChevronRight, CheckCircle, Info, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProofTierBadge } from "@/components/vin/ProofTierBadge";
import type { Event, FactWithEvidence, RedFlag } from "@/hooks/useVinDossier";
import type { Enums } from "@/integrations/supabase/types";

// ── Props ───────────────────────────────────────────────

interface EventCardProps {
  event: Event;
  facts: FactWithEvidence[];
  isExpanded: boolean;
  onToggle: () => void;
  onFactClick: (factId: string) => void;
  linkedRedFlags?: RedFlag[];
}

// ── Event type config ───────────────────────────────────

type EventType = Enums<"event_type">;

const EVENT_CFG: Record<EventType, { label: string; icon: typeof Wrench; color: string }> = {
  purchase:        { label: "Achat",                icon: ShoppingCart,   color: "hsl(var(--primary))" },
  sale:            { label: "Vente",                icon: Tag,            color: "hsl(152, 69%, 38%)" },
  accident:        { label: "Accident",             icon: AlertTriangle,  color: "hsl(0, 84%, 60%)" },
  repair:          { label: "Réparation",           icon: Wrench,         color: "hsl(32, 95%, 52%)" },
  maintenance:     { label: "Entretien",            icon: Settings,       color: "hsl(224, 78%, 47%)" },
  inspection:      { label: "Inspection",           icon: ClipboardCheck, color: "hsl(262, 60%, 55%)" },
  modification:    { label: "Modification",         icon: Paintbrush,     color: "hsl(280, 60%, 55%)" },
  recall:          { label: "Rappel constructeur",  icon: Bell,           color: "hsl(45, 93%, 47%)" },
  insurance_claim: { label: "Réclamation assurance",icon: Shield,         color: "hsl(200, 70%, 50%)" },
  listing:         { label: "Mise en vente",        icon: Globe,          color: "hsl(170, 55%, 45%)" },
  import_export:   { label: "Import/Export",        icon: Plane,          color: "hsl(210, 50%, 55%)" },
  registration:    { label: "Immatriculation",      icon: FileText,       color: "hsl(220, 40%, 50%)" },
  mileage_record:  { label: "Relevé kilométrique",  icon: Gauge,          color: "hsl(190, 50%, 45%)" },
  other:           { label: "Autre",                icon: CircleDot,      color: "hsl(var(--muted-foreground))" },
};

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

// ── Helpers ─────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = { verified: 0, documented: 1, declaration: 2 };

function formatEventDate(d: string | null, precision?: string | null): string {
  if (!d) return "Date inconnue";
  const date = new Date(d);
  if (precision === "year") return date.getFullYear().toString();
  if (precision === "month")
    return date.toLocaleDateString("fr-CA", { year: "numeric", month: "long" });
  return date.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

function highestTier(facts: FactWithEvidence[]): Enums<"proof_tier"> | null {
  for (const t of ["verified", "documented", "declaration"] as const) {
    if (facts.some((f) => f.fact.proof_tier === t)) return t;
  }
  return null;
}

function faceLabel(facts: FactWithEvidence[]): string {
  const a = facts.some((f) => f.fact.face === "face_a");
  const b = facts.some((f) => f.fact.face === "face_b");
  if (a && b) return "Face A + B";
  if (b) return "Face B";
  return "Face A";
}

function sortedFacts(facts: FactWithEvidence[]): FactWithEvidence[] {
  return [...facts].sort((a, b) => {
    const ta = TIER_ORDER[a.fact.proof_tier ?? "declaration"] ?? 2;
    const tb = TIER_ORDER[b.fact.proof_tier ?? "declaration"] ?? 2;
    if (ta !== tb) return ta - tb;
    return new Date(b.fact.created_at ?? 0).getTime() - new Date(a.fact.created_at ?? 0).getTime();
  });
}

// ── Convergence logic ───────────────────────────────────

interface Convergence {
  uniqueContributors: number;
  faceA: number;
  faceB: number;
  status: "convergent" | "single_community" | "single_owner" | "divergent";
  label: string;
  color: string;
  icon: typeof CheckCircle;
}

function computeConvergence(facts: FactWithEvidence[]): Convergence {
  const contributors = new Set(facts.map((f) => f.fact.contributor_id));
  const faceA = facts.filter((f) => f.fact.face === "face_a").length;
  const faceB = facts.filter((f) => f.fact.face === "face_b").length;

  // Simple heuristic: both faces present → convergent
  if (faceA > 0 && faceB > 0) {
    return {
      uniqueContributors: contributors.size,
      faceA, faceB,
      status: "convergent",
      label: "Sources convergentes",
      color: "hsl(152, 69%, 38%)",
      icon: CheckCircle,
    };
  }
  if (faceA > 0) {
    return {
      uniqueContributors: contributors.size,
      faceA, faceB,
      status: "single_community",
      label: "Source unique (communauté)",
      color: "hsl(224, 78%, 47%)",
      icon: Info,
    };
  }
  if (faceB > 0) {
    return {
      uniqueContributors: contributors.size,
      faceA, faceB,
      status: "single_owner",
      label: "Source unique (propriétaire)",
      color: "hsl(32, 95%, 52%)",
      icon: Info,
    };
  }
  return {
    uniqueContributors: 0,
    faceA: 0, faceB: 0,
    status: "single_community",
    label: "Aucune source",
    color: "hsl(var(--muted-foreground))",
    icon: AlertCircle,
  };
}

// ── Fact row ────────────────────────────────────────────

function FactItem({ fw, onClick }: { fw: FactWithEvidence; onClick: () => void }) {
  const [textExpanded, setTextExpanded] = useState(false);
  const role = fw.contributor?.role ? ROLE_LABELS[fw.contributor.role] ?? fw.contributor.role : "Contributeur";
  const content = fw.fact.content;
  const isLong = content.length > 180;

  return (
    <div className="py-2.5 border-b border-border/50 last:border-b-0">
      {/* Contributor + tier */}
      <div className="flex items-center gap-2 mb-1">
        <User size={13} className="text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-medium">{role}</span>
        {fw.fact.proof_tier && (
          <ProofTierBadge tier={fw.fact.proof_tier} size="xs" />
        )}
      </div>

      {/* Content */}
      <p className={`text-sm leading-relaxed text-foreground/90 ${!textExpanded && isLong ? "line-clamp-3" : ""}`}>
        {content}
      </p>
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setTextExpanded(!textExpanded); }}
          className="text-xs text-primary hover:underline mt-0.5"
        >
          {textExpanded ? "Réduire" : "Lire la suite"}
        </button>
      )}

      {/* Footer: evidence + action */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {fw.evidence.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip size={11} />
              {fw.evidence.length} pièce{fw.evidence.length > 1 ? "s" : ""} jointe{fw.evidence.length > 1 ? "s" : ""}
            </span>
          )}
          {fw.fact.created_at && (
            <span>
              {new Date(fw.fact.created_at).toLocaleDateString("fr-CA", {
                year: "numeric", month: "short", day: "numeric",
              })}
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Voir
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────

export function EventCard({
  event,
  facts,
  isExpanded,
  onToggle,
  onFactClick,
  linkedRedFlags = [],
}: EventCardProps) {
  const cfg = EVENT_CFG[event.event_type] ?? EVENT_CFG.other;
  const Icon = cfg.icon;
  const tier = highestTier(facts);
  const conv = computeConvergence(facts);
  const sorted = sortedFacts(facts);
  const ConvIcon = conv.icon;

  return (
    <Card className="overflow-hidden border-border/60 transition-shadow hover:shadow-sm">
      {/* Red flag banner */}
      {linkedRedFlags.length > 0 && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-1.5 flex items-center gap-2">
          <AlertTriangle size={13} className="text-destructive flex-shrink-0" />
          {linkedRedFlags.map((rf) => (
            <span key={rf.id} className="text-xs text-destructive font-medium">
              Lié à l'alerte : {rf.title}
            </span>
          ))}
        </div>
      )}

      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        {/* Header (always visible) */}
        <CollapsibleTrigger className="w-full text-left">
          <div className="px-4 py-3">
            {/* Row 1: type + date + mileage */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-[11px] px-2 py-0 h-5 gap-1 font-semibold border uppercase tracking-wide"
                style={{ color: cfg.color, borderColor: `${cfg.color}33` }}
              >
                <Icon size={12} />
                {cfg.label}
              </Badge>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatEventDate(event.event_date, event.event_date_precision)}</span>
                {event.mileage_at_event != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <Gauge size={12} />
                    {event.mileage_at_event.toLocaleString("fr-CA")} km
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: title */}
            <h4 className="text-sm font-medium leading-snug mb-1.5">{event.title}</h4>

            {/* Row 3: meta */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {tier && <ProofTierBadge tier={tier} size="xs" />}
                <span className="text-[11px] text-muted-foreground">
                  {facts.length} fait{facts.length !== 1 ? "s" : ""} · {faceLabel(facts)}
                </span>
              </div>

              <span className="text-xs text-primary inline-flex items-center gap-0.5">
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                />
                {isExpanded ? "Masquer" : "Voir"}
              </span>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded content */}
        <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="border-t border-border px-4 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Faits déposés
            </p>

            <div className="space-y-0">
              {sorted.map((fw) => (
                <FactItem
                  key={fw.fact.id}
                  fw={fw}
                  onClick={() => onFactClick(fw.fact.id)}
                />
              ))}
            </div>

            {/* Convergence summary */}
            {facts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <ConvIcon size={14} style={{ color: conv.color }} />
                  <span className="text-xs font-semibold" style={{ color: conv.color }}>
                    {conv.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {conv.uniqueContributors} source{conv.uniqueContributors !== 1 ? "s" : ""} confirme{conv.uniqueContributors !== 1 ? "nt" : ""} cet événement
                  {" · "}Face A : {conv.faceA} fait{conv.faceA !== 1 ? "s" : ""}
                  {" | "}Face B : {conv.faceB} fait{conv.faceB !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
