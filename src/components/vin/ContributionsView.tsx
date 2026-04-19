import { useEffect, useMemo, useState } from "react";
import { Camera, FileText, ClipboardCheck, Calendar, Gauge, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

const PHOTO_TYPES = ["photo", "image"];
const DOC_TYPES = ["document", "invoice", "inspection_report", "insurance_doc", "registration", "listing_screenshot"];

function isPhoto(ev: { evidence_type: string; file_type: string | null }) {
  return PHOTO_TYPES.includes(ev.evidence_type) || (ev.file_type ?? "").startsWith("image/");
}
function isDoc(ev: { evidence_type: string; file_type: string | null }) {
  return DOC_TYPES.includes(ev.evidence_type) || ev.file_type === "application/pdf";
}

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
  const [expanded, setExpanded] = useState(false);

  // Primary fact = first non-empty content
  const primaryFact: FactWithEvidence | undefined =
    ewf.facts.find((f) => f.fact.content && f.fact.content.trim().length > 0) ?? ewf.facts[0];
  const contributor = primaryFact?.contributor ?? null;
  const allEvidence = ewf.facts.flatMap((f) => f.evidence);
  const photos = allEvidence.filter(isPhoto);
  const docs = allEvidence.filter(isDoc);

  const displayName = contributor?.is_anonymous
    ? "Anonyme"
    : contributor?.display_name ?? "Contributeur";
  const roleLabel = contributor ? ROLE_LABELS[contributor.role] ?? "Contributeur" : "Contributeur";
  const eventLabel = EVENT_TYPE_LABELS[ewf.event.event_type] ?? "Autre";
  const dateLabel = formatDate(ewf.event.event_date);
  const memberSince = profile && !contributor?.is_anonymous ? formatMonthYear(profile.created_at) : null;
  const dossiersCount = profile && !contributor?.is_anonymous ? profile.vins_contributed_to ?? 0 : null;

  const content = primaryFact?.fact.content ?? ewf.event.description ?? "";
  const isLong = content.length > 240;
  const displayContent = !expanded && isLong ? content.slice(0, 240).trimEnd() + "…" : content;

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/40",
        isActive && "border-primary shadow-md ring-1 ring-primary/30"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {contributor?.is_anonymous ? "?" : initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-semibold text-sm text-foreground truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground">· {roleLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
            {dateLabel && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {dateLabel}
              </span>
            )}
            {ewf.event.mileage_at_event != null && (
              <span className="inline-flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                {ewf.event.mileage_at_event.toLocaleString("fr-CA")} km
              </span>
            )}
          </div>
          {(memberSince || (dossiersCount != null && dossiersCount > 0)) && (
            <div className="flex flex-wrap gap-x-2 mt-0.5 text-[10px] text-muted-foreground/70">
              {memberSince && <span>Membre depuis {memberSince}</span>}
              {memberSince && dossiersCount != null && dossiersCount > 0 && <span>·</span>}
              {dossiersCount != null && dossiersCount > 0 && (
                <span>A contribué à {dossiersCount} dossier{dossiersCount > 1 ? "s" : ""}</span>
              )}
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-1" />
      </div>

      {/* Body */}
      {content && (
        <div className="mb-3">
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {displayContent}
          </p>
          {isLong && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="text-xs text-primary hover:underline mt-1 font-medium"
            >
              {expanded ? "Voir moins" : "Lire la suite"}
            </button>
          )}
        </div>
      )}

      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="flex gap-1.5 mb-3">
          {photos.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border"
            >
              <img
                src={supabase.storage.from("vin-photos").getPublicUrl(p.file_path).data.publicUrl}
                alt={p.file_name}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {photos.length > 4 && (
            <div className="w-16 h-16 rounded-md bg-muted border border-border flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
              +{photos.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Documents */}
      {docs.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {docs.slice(0, 3).map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/60 text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate text-foreground/80">{d.file_name}</span>
            </div>
          ))}
          {docs.length > 3 && (
            <p className="text-[11px] text-muted-foreground pl-1">
              +{docs.length - 3} autre{docs.length - 3 > 1 ? "s" : ""} document{docs.length - 3 > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/60">
        <Badge variant="secondary" className="text-[10px] font-medium">
          {ewf.event.event_type === "inspection" && <ClipboardCheck className="w-3 h-3 mr-1" />}
          {eventLabel}
        </Badge>
        {photos.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Camera className="w-3 h-3" />
            {photos.length}
          </span>
        )}
        {docs.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <FileText className="w-3 h-3" />
            {docs.length}
          </span>
        )}
      </div>
    </Card>
  );
}
