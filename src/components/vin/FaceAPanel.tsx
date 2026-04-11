import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/vin/EventCard";
import type { EventWithFacts, Contributor } from "@/hooks/useVinDossier";

// ── Props ───────────────────────────────────────────────

interface FaceAPanelProps {
  events: EventWithFacts[];
  contributors: Contributor[];
  onFactClick: (factId: string) => void;
}

// ── Helpers ─────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner_verified: "PV", owner_unverified: "P", former_owner: "AP",
  buyer: "A", mechanic: "M", inspector: "I", dealer: "C", witness: "T", anonymous: "?",
};

function initials(c: Contributor): string {
  if (c.display_name) return c.display_name.slice(0, 2).toUpperCase();
  return ROLE_LABELS[c.role] ?? "?";
}

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-[hsl(152,69%,38%,0.15)] text-[hsl(152,69%,38%)]",
  "bg-[hsl(224,78%,47%,0.15)] text-[hsl(224,78%,47%)]",
  "bg-[hsl(32,95%,52%,0.15)] text-[hsl(32,95%,52%)]",
  "bg-[hsl(262,60%,55%,0.15)] text-[hsl(262,60%,55%)]",
];

// ── Main component ──────────────────────────────────────

export function FaceAPanel({ events, contributors, onFactClick }: FaceAPanelProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Filter events to only include face_a facts
  const faceAEvents = useMemo(() => {
    return events
      .map((ewf) => ({
        ...ewf,
        facts: ewf.facts.filter((f) => f.fact.face === "face_a"),
      }))
      .filter((ewf) => ewf.facts.length > 0);
  }, [events]);

  const faceAContributors = useMemo(() => {
    return contributors.filter((c) => c.face === "face_a");
  }, [contributors]);

  const uniqueUsers = useMemo(() => {
    return new Set(faceAContributors.filter((c) => !c.is_anonymous).map((c) => c.user_id)).size;
  }, [faceAContributors]);

  const totalFacts = useMemo(() => {
    return faceAEvents.reduce((sum, e) => sum + e.facts.length, 0);
  }, [faceAEvents]);

  // Tier distribution
  const tiers = useMemo(() => {
    let decl = 0, doc = 0, ver = 0;
    for (const e of faceAEvents) {
      for (const f of e.facts) {
        if (f.fact.proof_tier === "verified") ver++;
        else if (f.fact.proof_tier === "documented") doc++;
        else decl++;
      }
    }
    return { declaration: decl, documented: doc, verified: ver };
  }, [faceAEvents]);

  const tierTotal = tiers.declaration + tiers.documented + tiers.verified;
  const tierPct = (v: number) => tierTotal > 0 ? (v / tierTotal) * 100 : 0;

  const maxAvatars = 8;
  const shownContributors = faceAContributors.slice(0, maxAvatars);
  const extraCount = faceAContributors.length - maxAvatars;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users size={18} className="text-primary" />
          <h3 className="text-base font-semibold">Dossier communautaire</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {totalFacts} fait{totalFacts !== 1 ? "s" : ""} déposé{totalFacts !== 1 ? "s" : ""} par {uniqueUsers} contributeur{uniqueUsers !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Contributor avatars */}
      {faceAContributors.length > 0 && (
        <div className="flex items-center gap-1">
          {shownContributors.map((c, i) => (
            <div
              key={c.id}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
              title={c.display_name ?? c.role}
            >
              {initials(c)}
            </div>
          ))}
          {extraCount > 0 && (
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
              +{extraCount}
            </div>
          )}
        </div>
      )}

      {/* Events with face_a facts */}
      {faceAEvents.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <Users size={28} className="mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Aucun fait communautaire n'a été déposé pour ce véhicule.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Soyez le premier à contribuer au dossier.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {faceAEvents.map((ewf) => (
            <EventCard
              key={ewf.event.id}
              event={ewf.event}
              facts={ewf.facts}
              isExpanded={expandedEvent === ewf.event.id}
              onToggle={() =>
                setExpandedEvent((prev) => (prev === ewf.event.id ? null : ewf.event.id))
              }
              onFactClick={onFactClick}
            />
          ))}
        </div>
      )}

      {/* Tier distribution bar */}
      {tierTotal > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Déclarations : {tiers.declaration}</span>
            <span>Documentés : {tiers.documented}</span>
            <span>Vérifiés : {tiers.verified}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex bg-muted">
            {tiers.declaration > 0 && (
              <div
                className="bg-muted-foreground/40 h-full transition-all"
                style={{ width: `${tierPct(tiers.declaration)}%` }}
              />
            )}
            {tiers.documented > 0 && (
              <div
                className="bg-[hsl(224,78%,47%)] h-full transition-all"
                style={{ width: `${tierPct(tiers.documented)}%` }}
              />
            )}
            {tiers.verified > 0 && (
              <div
                className="bg-[hsl(152,69%,38%)] h-full transition-all"
                style={{ width: `${tierPct(tiers.verified)}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
