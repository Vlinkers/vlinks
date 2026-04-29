import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdmin } from "@/hooks/useAdmin";
import { ContributionDetailPanel, type ProfileMeta } from "@/components/vin/ContributionDetailPanel";
import { AdminContributionEditDialog } from "@/components/vin/AdminContributionEditDialog";
import { VinContributionCard } from "@/components/vin/VinContributionCard";
import { isDocumentEvidence, isVehiclePhotoEvidence } from "@/lib/mediaClassification";
import type { EventWithFacts, Contributor, VinDossier } from "@/hooks/useVinDossier";

// ── Profile lookup ──────────────────────────────────────

function useContributorProfiles(contributors: Contributor[]) {
  const [profiles, setProfiles] = useState<Record<string, ProfileMeta>>({});
  const userIds = useMemo(
    () => Array.from(new Set(contributors.map((c) => c.user_id).filter((id): id is string => !!id))),
    [contributors]
  );
  const key = userIds.sort().join(",");

  useEffect(() => {
    if (!userIds.length) { setProfiles({}); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, created_at, vins_contributed_to")
        .in("user_id", userIds);
      if (cancelled || !data) return;
      const map: Record<string, ProfileMeta> = {};
      for (const p of data) map[p.user_id] = { created_at: p.created_at, vins_contributed_to: p.vins_contributed_to };
      setProfiles(map);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return profiles;
}


// ── Filters ─────────────────────────────────────────────

type FilterKey = "all" | "photos" | "documents" | "inspections";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "photos", label: "Avec photos" },
  { key: "documents", label: "Avec documents" },
  { key: "inspections", label: "Rapports d'inspection" },
];

function eventMatchesFilter(ewf: EventWithFacts, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "inspections") return ewf.event.event_type === "inspection";
  const allEvidence = ewf.facts.flatMap((f) => f.evidence);
  if (filter === "photos") return allEvidence.some(isVehiclePhotoEvidence);
  if (filter === "documents") return allEvidence.some(isDocumentEvidence);
  return true;
}

// ── Main component ──────────────────────────────────────

interface ContributionsViewProps {
  dossier: VinDossier | null | undefined;
}

export function ContributionsView({ dossier }: ContributionsViewProps) {
  const isMobile = useIsMobile();
  const { isAdmin } = useAdmin();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEwf, setEditingEwf] = useState<EventWithFacts | null>(null);

  const events = dossier?.events ?? [];
  const contributors = dossier?.contributors ?? [];
  const profiles = useContributorProfiles(contributors);
  const vinId = dossier?.vin.id ?? "";

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      const da = a.event.event_date ? new Date(a.event.event_date).getTime() : 0;
      const db = b.event.event_date ? new Date(b.event.event_date).getTime() : 0;
      return db - da;
    });
  }, [events]);

  const filtered = useMemo(
    () => sorted.filter((ewf) => eventMatchesFilter(ewf, filter)),
    [sorted, filter]
  );

  const selectedEwf = useMemo(
    () => events.find((e) => e.event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const panelOpen = !!selectedEventId && !!selectedEwf;

  return (
    <div className="animate-in fade-in duration-200">
      <header className="mb-5">
        <h2 className="font-display text-2xl font-bold text-foreground">Contributions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {events.length} contribution{events.length !== 1 ? "s" : ""} déposée{events.length !== 1 ? "s" : ""} sur ce véhicule.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* List — compresses on desktop when panel is open */}
      <div
        className={cn(
          "transition-all duration-300 ease-out",
          panelOpen && !isMobile ? "lg:max-w-[55%] lg:pr-4" : "max-w-full"
        )}
      >
        {filtered.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <p className="text-sm text-muted-foreground">
              {events.length === 0
                ? "Aucune contribution n'a encore été déposée sur ce véhicule."
                : "Aucune contribution ne correspond à ce filtre."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((ewf) => {
              const userId = ewf.facts[0]?.contributor?.user_id;
              void userId;
              return (
                <VinContributionCard
                  key={ewf.event.id}
                  ewf={ewf}
                  isActive={ewf.event.id === selectedEventId}
                  onClick={() => setSelectedEventId(ewf.event.id)}
                  isAdmin={isAdmin}
                  onEdit={() => setEditingEwf(ewf)}
                />
              );
            })}
          </div>
        )}
      </div>

      <ContributionDetailPanel
        ewf={selectedEwf}
        open={panelOpen}
        onClose={() => setSelectedEventId(null)}
        profiles={profiles}
        isAdmin={isAdmin}
        onAdminEdit={() => selectedEwf && setEditingEwf(selectedEwf)}
      />

      <AdminContributionEditDialog
        ewf={editingEwf}
        open={!!editingEwf}
        onOpenChange={(o) => { if (!o) setEditingEwf(null); }}
        vinId={vinId}
      />
    </div>
  );
}

