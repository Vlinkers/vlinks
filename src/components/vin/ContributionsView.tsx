import { useEffect, useMemo, useState } from "react";
import { Camera, FileText, ClipboardCheck, Calendar, Gauge, ChevronRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildPhotoUrl } from "@/lib/photoUrl";
import { isDocumentEvidence, isVehiclePhotoEvidence } from "@/lib/mediaClassification";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContributionDetailPanel, type ProfileMeta } from "@/components/vin/ContributionDetailPanel";
import type { EventWithFacts, FactWithEvidence, Contributor, VinDossier } from "@/hooks/useVinDossier";

// ── Labels ──────────────────────────────────────────────

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

const EVENT_TYPE_LABELS: Record<string, string> = {
  purchase: "Achat",
  sale: "Vente",
  accident: "Accident",
  repair: "Réparation",
  maintenance: "Entretien",
  inspection: "Inspection",
  modification: "Modification",
  recall: "Rappel",
  insurance_claim: "Réclamation d'assurance",
  listing: "Mise en vente",
  import_export: "Import / Export",
  registration: "Immatriculation",
  mileage_record: "Relevé kilométrique",
  other: "Autre",
};

// photoUrl now provided by shared buildPhotoUrl utility

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

// ── Helpers ─────────────────────────────────────────────

function initials(name: string | null | undefined, fallback = "?") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
  } catch { return null; }
}
function formatMonthYear(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
  } catch { return null; }
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
  if (filter === "photos") return allEvidence.some(isPhoto);
  if (filter === "documents") return allEvidence.some(isDoc);
  return true;
}

// ── Main component ──────────────────────────────────────

interface ContributionsViewProps {
  dossier: VinDossier | null | undefined;
}

export function ContributionsView({ dossier }: ContributionsViewProps) {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const events = dossier?.events ?? [];
  const contributors = dossier?.contributors ?? [];
  const profiles = useContributorProfiles(contributors);

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
              return (
                <ContributionCard
                  key={ewf.event.id}
                  ewf={ewf}
                  profile={userId ? profiles[userId] : undefined}
                  isActive={ewf.event.id === selectedEventId}
                  onClick={() => setSelectedEventId(ewf.event.id)}
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
      />
    </div>
  );
}

// ── Card ────────────────────────────────────────────────

function ContributionCard({
  ewf,
  profile,
  isActive,
  onClick,
}: {
  ewf: EventWithFacts;
  profile: ProfileMeta | undefined;
  isActive: boolean;
  onClick: () => void;
}) {
  // Primary fact = first non-empty content
  const primaryFact: FactWithEvidence | undefined =
    ewf.facts.find((f) => f.fact.content && f.fact.content.trim().length > 0) ?? ewf.facts[0];
  const contributor = primaryFact?.contributor ?? null;
  const allEvidence = ewf.facts.flatMap((f) => f.evidence);
  const photos = allEvidence.filter(isVehiclePhotoEvidence);
  const docs = allEvidence.filter(isDocumentEvidence);

  const isOwnerContribution = !!contributor && ["owner_verified", "owner_unverified", "former_owner"].includes(contributor.role);
  const isVerifiedOwner = contributor?.role === "owner_verified";

  const displayName = contributor?.is_anonymous
    ? "Anonyme"
    : contributor?.display_name ?? "Contributeur";
  const roleLabel = contributor ? ROLE_LABELS[contributor.role] ?? "Contributeur" : "Contributeur";
  const showEventBadge = ewf.event.event_type !== "other";
  const eventLabel = EVENT_TYPE_LABELS[ewf.event.event_type] ?? "";
  const dateLabel = formatDate(ewf.event.event_date);

  const content = primaryFact?.fact.content ?? ewf.event.description ?? "";
  void profile; // currently unused — reserved for future contributor metadata
  void formatMonthYear;

  const isInspection = ewf.event.event_type === "inspection";
  const askingPrice = (ewf.event as any).asking_price as number | null | undefined;

  // Border-left semantic
  const borderClass = isOwnerContribution
    ? "border-l-[3px] border-l-[hsl(170,70%,35%)]"
    : isInspection
      ? "border-l-[3px] border-l-primary"
      : "border-l border-l-border";

  return (
    <Card
      className={cn(
        "p-0 cursor-pointer transition-all hover:shadow-md hover:border-primary/40 overflow-hidden",
        borderClass,
        isActive && "shadow-md ring-1 ring-primary/30"
      )}
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row">
        {/* LEFT — Metadata block (~28%) */}
        <div className={cn(
          "sm:w-[28%] sm:max-w-[180px] p-3 flex flex-col gap-2 border-b sm:border-b-0 sm:border-r border-border/60",
          isOwnerContribution ? "bg-[hsl(170,55%,97%)]" : isInspection ? "bg-primary/5" : "bg-muted/30"
        )}>
          <div className="flex items-center gap-2.5">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarFallback className={cn(
                "text-[11px] font-semibold",
                isOwnerContribution
                  ? "bg-[hsl(170,55%,88%)] text-[hsl(170,70%,25%)]"
                  : "bg-primary/15 text-primary"
              )}>
                {contributor?.is_anonymous ? "?" : initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{roleLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {isOwnerContribution && (
              <Badge className={cn(
                "text-[10px] h-4 px-1.5",
                isVerifiedOwner
                  ? "bg-[hsl(170,70%,35%)] text-white hover:bg-[hsl(170,70%,30%)]"
                  : "bg-[hsl(170,40%,90%)] text-[hsl(170,70%,25%)] hover:bg-[hsl(170,40%,85%)]"
              )}>
                {isVerifiedOwner && <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />}
                Propriétaire
              </Badge>
            )}
            {isInspection && !isOwnerContribution && (
              <Badge className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary hover:bg-primary/20">
                <ClipboardCheck className="w-2.5 h-2.5 mr-0.5" />
                Rapport
              </Badge>
            )}
            {showEventBadge && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium">
                {eventLabel}
              </Badge>
            )}
          </div>

          {dateLabel && (
            <div className="mt-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Date</p>
              <p className="font-display text-base font-bold text-foreground leading-tight">{dateLabel}</p>
            </div>
          )}

          {(ewf.event.mileage_at_event != null || askingPrice != null) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
              {ewf.event.mileage_at_event != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium inline-flex items-center gap-1">
                    <Gauge className="w-2.5 h-2.5" />Km
                  </p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {ewf.event.mileage_at_event.toLocaleString("fr-CA")}
                  </p>
                </div>
              )}
              {askingPrice != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Prix</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {askingPrice.toLocaleString("fr-CA")} $
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Content + indicators (70%) */}
        <div className="flex-1 p-4 flex flex-col min-w-0">
          {content ? (
            <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2 flex-1">
              {content}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic flex-1">Aucune description</p>
          )}

          {/* Photo thumbnails (max 4 + overflow badge) */}
          {photos.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3">
              {photos.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="relative w-14 h-14 rounded-md overflow-hidden border border-border/60 bg-muted flex-shrink-0"
                >
                  <img
                    src={buildPhotoUrl(p.file_path)}
                    alt={p.description ?? p.file_name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {photos.length > 4 && (
                <div className="w-14 h-14 rounded-md border border-border/60 bg-muted/60 flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                  +{photos.length - 4}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/60">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {photos.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  <span className="tabular-nums font-medium">{photos.length}</span>
                </span>
              )}
              {docs.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="tabular-nums font-medium">{docs.length}</span>
                </span>
              )}
              {photos.length === 0 && docs.length === 0 && (
                <span className="text-[11px] text-muted-foreground/50">Aucune pièce jointe</span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              Lire la suite
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
