import { useMemo, useState } from "react";
import { Shield, ShieldCheck, Calendar, Gauge, FileText, Camera, ChevronRight, Home, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { ContributionDetailPanel, type ProfileMeta } from "@/components/vin/ContributionDetailPanel";
import type { EventWithFacts, FactWithEvidence, VinDossier } from "@/hooks/useVinDossier";

const OWNER_ROLES = new Set(["owner_verified", "owner_unverified", "former_owner"]);

const ROLE_LABELS: Record<string, string> = {
  owner_verified: "Propriétaire vérifié",
  owner_unverified: "Propriétaire",
  former_owner: "Ancien propriétaire",
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
function photoUrl(path: string) {
  if (path.startsWith("http")) return path;
  return supabase.storage.from("vin-photos").getPublicUrl(path).data.publicUrl;
}
function initials(name: string | null | undefined) {
  if (!name) return "?";
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

interface OwnerViewProps {
  dossier: VinDossier | null | undefined;
  vinId: string;
  vin: string;
}

export function OwnerView({ dossier, vinId, vin }: OwnerViewProps) {
  const isMobile = useIsMobile();
  const [claimOpen, setClaimOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const events = dossier?.events ?? [];
  const contributors = dossier?.contributors ?? [];

  // Owner-related events: at least one fact whose contributor is an owner role
  const ownerEvents = useMemo<EventWithFacts[]>(() => {
    const filtered = events.filter((ewf) =>
      ewf.facts.some((f) => f.contributor && OWNER_ROLES.has(f.contributor.role))
    );
    return [...filtered].sort((a, b) => {
      const da = a.event.event_date ? new Date(a.event.event_date).getTime() : 0;
      const db = b.event.event_date ? new Date(b.event.event_date).getTime() : 0;
      return db - da;
    });
  }, [events]);

  const hasVerifiedOwner = contributors.some((c) => c.role === "owner_verified");
  const hasAnyOwner = contributors.some((c) => OWNER_ROLES.has(c.role));

  const selectedEwf = useMemo(
    () => events.find((e) => e.event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const panelOpen = !!selectedEventId && !!selectedEwf;

  return (
    <div className="animate-in fade-in duration-200">
      {/* Tinted backdrop wrapper for the section */}
      <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 px-4 md:px-6 pt-4 md:pt-6 pb-4 bg-[hsl(170,55%,96%)] border-b border-[hsl(170,40%,85%)]">
        <header className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(170,55%,90%)] flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[hsl(170,70%,30%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-display text-2xl font-bold text-foreground">Dossier propriétaire</h2>
              {hasVerifiedOwner ? (
                <Badge className="bg-[hsl(170,70%,35%)] text-white hover:bg-[hsl(170,70%,30%)]">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Propriétaire vérifié
                </Badge>
              ) : hasAnyOwner ? (
                <Badge variant="secondary" className="bg-[hsl(170,40%,90%)] text-[hsl(170,70%,25%)]">
                  Propriétaire déclaré
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Non revendiqué
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Espace officiel — contributions du propriétaire actuel ou passé.
            </p>
          </div>
        </header>
      </div>

      {/* No owner yet — invitation */}
      {!hasAnyOwner ? (
        <Card className="p-8 text-center border-dashed border-[hsl(170,40%,70%)] bg-[hsl(170,55%,98%)]">
          <div className="w-14 h-14 rounded-full bg-[hsl(170,55%,90%)] flex items-center justify-center mx-auto mb-4">
            <Home className="w-7 h-7 text-[hsl(170,70%,30%)]" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">
            Ce véhicule n'a pas encore de propriétaire déclaré sur VLINKS
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Si vous êtes le propriétaire actuel, vous pouvez revendiquer ce dossier pour ajouter
            l'historique d'entretien officiel et répondre aux observations de la communauté.
          </p>
          <Button
            onClick={() => setClaimOpen(true)}
            className="bg-[hsl(170,70%,30%)] hover:bg-[hsl(170,70%,25%)] text-white"
          >
            <Shield className="w-4 h-4 mr-2" />
            Je suis le propriétaire actuel — Revendiquer ce VIN
          </Button>
          <p className="text-xs text-muted-foreground/70 mt-4 inline-flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Vérification documentaire requise (carte grise, plaque VIN…)
          </p>
        </Card>
      ) : ownerEvents.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-[hsl(170,55%,98%)]">
          <p className="text-sm text-muted-foreground">
            Aucune contribution du propriétaire n'a encore été déposée.
          </p>
        </Card>
      ) : (
        <div
          className={cn(
            "transition-all duration-300 ease-out",
            panelOpen && !isMobile ? "lg:max-w-[55%] lg:pr-4" : "max-w-full"
          )}
        >
          <div className="space-y-3">
            {ownerEvents.map((ewf) => (
              <OwnerContributionCard
                key={ewf.event.id}
                ewf={ewf}
                isActive={ewf.event.id === selectedEventId}
                onClick={() => setSelectedEventId(ewf.event.id)}
              />
            ))}
          </div>
        </div>
      )}

      <ContributionDetailPanel
        ewf={selectedEwf}
        open={panelOpen}
        onClose={() => setSelectedEventId(null)}
        profiles={{} as Record<string, ProfileMeta>}
      />

      <OwnerClaimForm
        vinId={vinId}
        vin={vin}
        open={claimOpen}
        onOpenChange={setClaimOpen}
        onSuccess={() => setClaimOpen(false)}
      />
    </div>
  );
}

// ── Card with teal left border ─────────────────────────────

function OwnerContributionCard({
  ewf,
  isActive,
  onClick,
}: {
  ewf: EventWithFacts;
  isActive: boolean;
  onClick: () => void;
}) {
  const ownerFact: FactWithEvidence | undefined =
    ewf.facts.find((f) => f.contributor && OWNER_ROLES.has(f.contributor.role)) ?? ewf.facts[0];
  const contributor = ownerFact?.contributor ?? null;
  const isVerified = contributor?.role === "owner_verified";

  const allEvidence = ewf.facts.flatMap((f) => f.evidence);
  const photos = allEvidence.filter(isPhoto);
  const docs = allEvidence.filter(isDoc);

  const displayName = contributor?.is_anonymous
    ? "Propriétaire (anonyme)"
    : contributor?.display_name ?? "Propriétaire";
  const roleLabel = contributor ? ROLE_LABELS[contributor.role] ?? "Propriétaire" : "Propriétaire";
  const eventLabel = EVENT_TYPE_LABELS[ewf.event.event_type] ?? "Autre";
  const dateLabel = formatDate(ewf.event.event_date);
  const content = ownerFact?.fact.content ?? ewf.event.description ?? "";

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md border-l-4 border-l-[hsl(170,70%,35%)]",
        isActive ? "shadow-md ring-1 ring-[hsl(170,70%,35%)]/40" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback className="bg-[hsl(170,55%,90%)] text-[hsl(170,70%,25%)] text-xs font-semibold">
            {contributor?.is_anonymous ? "?" : initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-sm text-foreground truncate">{displayName}</span>
            <Badge
              className={cn(
                "text-[10px] h-5",
                isVerified
                  ? "bg-[hsl(170,70%,35%)] text-white hover:bg-[hsl(170,70%,30%)]"
                  : "bg-[hsl(170,40%,90%)] text-[hsl(170,70%,25%)] hover:bg-[hsl(170,40%,85%)]"
              )}
            >
              {isVerified && <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />}
              {roleLabel}
            </Badge>
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
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-1" />
      </div>

      {content && (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line mb-3 line-clamp-4">
          {content}
        </p>
      )}

      {photos.length > 0 && (
        <div className="flex gap-1.5 mb-3">
          {photos.slice(0, 4).map((p) => (
            <div key={p.id} className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border">
              <img src={photoUrl(p.file_path)} alt={p.file_name} loading="lazy" className="w-full h-full object-cover" />
            </div>
          ))}
          {photos.length > 4 && (
            <div className="w-16 h-16 rounded-md bg-muted border border-border flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
              +{photos.length - 4}
            </div>
          )}
        </div>
      )}

      {docs.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {docs.slice(0, 3).map((d) => (
            <div key={d.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[hsl(170,55%,96%)] text-xs">
              <FileText className="w-3.5 h-3.5 text-[hsl(170,70%,30%)] flex-shrink-0" />
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

      <div className="flex items-center gap-2 pt-2 border-t border-border/60">
        <Badge variant="secondary" className="text-[10px] font-medium">{eventLabel}</Badge>
        {photos.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Camera className="w-3 h-3" />{photos.length}
          </span>
        )}
        {docs.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <FileText className="w-3 h-3" />{docs.length}
          </span>
        )}
      </div>
    </Card>
  );
}
