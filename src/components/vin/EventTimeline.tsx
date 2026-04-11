import { useState } from "react";
import {
  ShoppingCart, Tag, AlertTriangle, Wrench, Settings, ClipboardCheck,
  Paintbrush, Bell, Shield, Globe, Plane, FileText, Gauge, CircleDot,
  ChevronDown, ChevronRight, User, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProofTierBadge } from "@/components/vin/ProofTierBadge";
import type { EventWithFacts, VehiclePhase, FactWithEvidence } from "@/hooks/useVinDossier";
import type { Enums } from "@/integrations/supabase/types";

// ── Props ───────────────────────────────────────────────

interface EventTimelineProps {
  events: EventWithFacts[];
  phases: VehiclePhase[];
  onEventClick: (eventId: string) => void;
  onFactClick: (factId: string) => void;
}

// ── Event type config ───────────────────────────────────

type EventType = Enums<"event_type">;

const EVENT_CONFIG: Record<EventType, { label: string; icon: typeof Wrench; color: string }> = {
  purchase:        { label: "Achat",                icon: ShoppingCart,  color: "hsl(var(--primary))" },
  sale:            { label: "Vente",                icon: Tag,           color: "hsl(152, 69%, 38%)" },
  accident:        { label: "Accident",             icon: AlertTriangle, color: "hsl(0, 84%, 60%)" },
  repair:          { label: "Réparation",           icon: Wrench,        color: "hsl(32, 95%, 52%)" },
  maintenance:     { label: "Entretien",            icon: Settings,      color: "hsl(224, 78%, 47%)" },
  inspection:      { label: "Inspection",           icon: ClipboardCheck,color: "hsl(262, 60%, 55%)" },
  modification:    { label: "Modification",         icon: Paintbrush,    color: "hsl(280, 60%, 55%)" },
  recall:          { label: "Rappel constructeur",  icon: Bell,          color: "hsl(45, 93%, 47%)" },
  insurance_claim: { label: "Réclamation assurance",icon: Shield,        color: "hsl(200, 70%, 50%)" },
  listing:         { label: "Mise en vente",        icon: Globe,         color: "hsl(170, 55%, 45%)" },
  import_export:   { label: "Import/Export",        icon: Plane,         color: "hsl(210, 50%, 55%)" },
  registration:    { label: "Immatriculation",      icon: FileText,      color: "hsl(220, 40%, 50%)" },
  mileage_record:  { label: "Relevé kilométrique",  icon: Gauge,         color: "hsl(190, 50%, 45%)" },
  other:           { label: "Autre",                icon: CircleDot,     color: "hsl(var(--muted-foreground))" },
};

// ── Filter chips ────────────────────────────────────────

const EVENT_FILTERS: { key: string; label: string; types?: EventType[] }[] = [
  { key: "all", label: "Tous" },
  { key: "accidents", label: "Accidents", types: ["accident"] },
  { key: "maintenance", label: "Entretiens", types: ["maintenance", "repair"] },
  { key: "inspections", label: "Inspections", types: ["inspection"] },
  { key: "sales", label: "Ventes", types: ["sale", "purchase", "listing"] },
];

const FACE_FILTERS = [
  { key: "all", label: "Tous" },
  { key: "face_a", label: "Face A" },
  { key: "face_b", label: "Face B" },
] as const;

// ── Contributor role labels ─────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner_verified: "propriétaire vérifié",
  owner_unverified: "propriétaire",
  former_owner: "ancien propriétaire",
  buyer: "acheteur",
  mechanic: "mécanicien",
  inspector: "inspecteur",
  dealer: "concessionnaire",
  witness: "témoin",
  anonymous: "anonyme",
};

// ── Helpers ─────────────────────────────────────────────

function formatDate(d: string | null, precision?: string | null): string {
  if (!d) return "Date inconnue";
  const date = new Date(d);
  if (precision === "year") return date.getFullYear().toString();
  if (precision === "month") {
    return date.toLocaleDateString("fr-CA", { year: "numeric", month: "long" });
  }
  return date.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

function highestTier(facts: FactWithEvidence[]): Enums<"proof_tier"> | null {
  const order: Enums<"proof_tier">[] = ["verified", "documented", "declaration"];
  for (const t of order) {
    if (facts.some((f) => f.fact.proof_tier === t)) return t;
  }
  return null;
}

function faceLabel(facts: FactWithEvidence[]): string {
  const hasA = facts.some((f) => f.fact.face === "face_a");
  const hasB = facts.some((f) => f.fact.face === "face_b");
  if (hasA && hasB) return "Face A + B";
  if (hasB) return "Face B";
  return "Face A";
}

function dominantRole(facts: FactWithEvidence[]): string {
  for (const f of facts) {
    if (f.contributor?.role) return ROLE_LABELS[f.contributor.role] ?? f.contributor.role;
  }
  return "";
}

// ── Phase helpers ───────────────────────────────────────

function phaseLabel(phase: VehiclePhase): string {
  const start = phase.start_date
    ? new Date(phase.start_date).toLocaleDateString("fr-CA", { year: "numeric", month: "long" })
    : "?";
  const end = phase.end_date
    ? new Date(phase.end_date).toLocaleDateString("fr-CA", { year: "numeric", month: "long" })
    : "aujourd'hui";

  const typeLabels: Record<string, string> = {
    ownership: "Propriétaire",
    dealer_inventory: "Inventaire concessionnaire",
    for_sale: "En vente",
  };
  const typeStr = typeLabels[phase.phase_type] ?? phase.phase_type;

  return phase.end_date
    ? `${typeStr} (${start} – ${end})`
    : `${typeStr} actuel (depuis ${start})`;
}

// Group events into phases; unmatched go to "unphased"
function groupEventsByPhase(
  events: EventWithFacts[],
  phases: VehiclePhase[]
): { phase: VehiclePhase | null; events: EventWithFacts[] }[] {
  if (phases.length === 0) {
    return [{ phase: null, events }];
  }

  const groups: Map<string | "__none__", EventWithFacts[]> = new Map();
  // Init phase buckets in order
  for (const p of phases) groups.set(p.id, []);
  groups.set("__none__", []);

  for (const ev of events) {
    if (ev.event.phase_id && groups.has(ev.event.phase_id)) {
      groups.get(ev.event.phase_id)!.push(ev);
    } else {
      groups.get("__none__")!.push(ev);
    }
  }

  const phaseMap = new Map(phases.map((p) => [p.id, p]));
  const result: { phase: VehiclePhase | null; events: EventWithFacts[] }[] = [];

  // Phases in order (reversed so current first)
  for (const p of [...phases].reverse()) {
    const evs = groups.get(p.id) ?? [];
    result.push({ phase: p, events: evs });
  }

  const unphased = groups.get("__none__") ?? [];
  if (unphased.length > 0) {
    result.push({ phase: null, events: unphased });
  }

  return result;
}

// ── Fact row ────────────────────────────────────────────

function FactRow({ fw, onClick }: { fw: FactWithEvidence; onClick: () => void }) {
  const role = fw.contributor?.role ? ROLE_LABELS[fw.contributor.role] ?? fw.contributor.role : "";
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 transition-colors flex items-start gap-2 group"
    >
      <User size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug line-clamp-2">{fw.fact.content}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {fw.fact.proof_tier && (
            <ProofTierBadge tier={fw.fact.proof_tier} size="xs" showLabel={false} />
          )}
          <span className="text-[10px] text-muted-foreground capitalize">{role}</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 h-4 border-border"
          >
            {fw.fact.face === "face_b" ? "Face B" : "Face A"}
          </Badge>
          {fw.evidence.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {fw.evidence.length} preuve{fw.evidence.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={14} className="mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}

// ── Event node ──────────────────────────────────────────

function EventNode({
  ewf,
  onEventClick,
  onFactClick,
}: {
  ewf: EventWithFacts;
  onEventClick: (id: string) => void;
  onFactClick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ev = ewf.event;
  const cfg = EVENT_CONFIG[ev.event_type] ?? EVENT_CONFIG.other;
  const Icon = cfg.icon;
  const tier = highestTier(ewf.facts);

  const sortedFacts = [...ewf.facts].sort((a, b) => {
    if (a.fact.face === "face_a" && b.fact.face !== "face_a") return -1;
    if (a.fact.face !== "face_a" && b.fact.face === "face_a") return 1;
    return 0;
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="relative flex gap-3 pb-6 last:pb-0">
        {/* Timeline connector line */}
        <div className="flex flex-col items-center flex-shrink-0 w-6">
          <div
            className="w-3 h-3 rounded-full border-2 mt-1.5 flex-shrink-0"
            style={{ borderColor: cfg.color, backgroundColor: open ? cfg.color : "transparent" }}
          />
          <div className="w-0.5 flex-1 bg-border mt-1" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 -mt-0.5">
          <CollapsibleTrigger
            className="w-full text-left group"
            onClick={() => onEventClick(ev.id)}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                {/* Date + type */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-0.5">
                  <span>{formatDate(ev.event_date, ev.event_date_precision)}</span>
                  {ev.mileage_at_event != null && (
                    <span className="inline-flex items-center gap-0.5">
                      <Gauge size={11} />
                      {ev.mileage_at_event.toLocaleString("fr-CA")} km
                    </span>
                  )}
                </div>

                {/* Type badge + title */}
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 gap-1 border font-medium"
                    style={{ color: cfg.color, borderColor: `${cfg.color}33` }}
                  >
                    <Icon size={11} />
                    {cfg.label}
                  </Badge>
                  <h4 className="text-sm font-medium truncate">{ev.title}</h4>
                </div>

                {/* Meta line */}
                <div className="flex flex-wrap items-center gap-2">
                  {tier && <ProofTierBadge tier={tier} size="xs" />}
                  <span className="text-[11px] text-muted-foreground">
                    {ewf.facts.length} fait{ewf.facts.length !== 1 ? "s" : ""} · {faceLabel(ewf.facts)}
                    {dominantRole(ewf.facts) && ` (${dominantRole(ewf.facts)})`}
                  </span>
                </div>
              </div>

              <ChevronDown
                size={16}
                className={`mt-1 flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {ev.description && (
              <p className="text-xs text-muted-foreground mt-2 mb-1 pl-1 line-clamp-3">
                {ev.description}
              </p>
            )}
            <div className="mt-2 space-y-0.5 border-l-2 border-border ml-1 pl-1">
              {sortedFacts.map((fw) => (
                <FactRow key={fw.fact.id} fw={fw} onClick={() => onFactClick(fw.fact.id)} />
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}

// ── Main component ──────────────────────────────────────

export function EventTimeline({ events, phases, onEventClick, onFactClick }: EventTimelineProps) {
  const [eventFilter, setEventFilter] = useState("all");
  const [faceFilter, setFaceFilter] = useState<string>("all");

  // Apply filters
  const filtered = events
    .filter((ewf) => {
      if (eventFilter === "all") return true;
      const filterCfg = EVENT_FILTERS.find((f) => f.key === eventFilter);
      return filterCfg?.types?.includes(ewf.event.event_type) ?? true;
    })
    .filter((ewf) => {
      if (faceFilter === "all") return true;
      return ewf.facts.some((f) => f.fact.face === faceFilter);
    });

  const grouped = groupEventsByPhase(filtered, phases);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {EVENT_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setEventFilter(f.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              eventFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="w-px bg-border mx-1 self-stretch" />

        {FACE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFaceFilter(f.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              faceFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CircleDot size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucun événement ne correspond aux filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group, gi) => (
            <div key={group.phase?.id ?? `unphased-${gi}`}>
              {/* Phase header */}
              {group.phase ? (
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {phaseLabel(group.phase)}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              ) : phases.length > 0 ? (
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground italic">
                    Période non documentée
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              ) : null}

              {group.events.length > 0 ? (
                <div>
                  {group.events.map((ewf) => (
                    <EventNode
                      key={ewf.event.id}
                      ewf={ewf}
                      onEventClick={onEventClick}
                      onFactClick={onFactClick}
                    />
                  ))}
                </div>
              ) : group.phase ? (
                <p className="text-xs text-muted-foreground italic pl-9 pb-4">
                  Pas d'événements enregistrés pour cette période.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
