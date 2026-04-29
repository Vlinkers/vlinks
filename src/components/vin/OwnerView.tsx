import { useMemo, useState } from "react";
import { Shield, ShieldCheck, Home, Lock, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { ContributionDetailPanel, type ProfileMeta } from "@/components/vin/ContributionDetailPanel";
import { AdminContributionEditDialog } from "@/components/vin/AdminContributionEditDialog";
import { VinContributionCard } from "@/components/vin/VinContributionCard";
import type { EventWithFacts, VinDossier } from "@/hooks/useVinDossier";

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

// photoUrl now provided by shared buildPhotoUrl utility
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
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [claimOpen, setClaimOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEwf, setEditingEwf] = useState<EventWithFacts | null>(null);

  const events = dossier?.events ?? [];
  const contributors = dossier?.contributors ?? [];

  // Check if current user has a pending verification for this VIN
  const { data: myPendingVerification } = useQuery({
    queryKey: ["my-owner-verification", vinId, user?.id],
    enabled: !!user?.id && !!vinId,
    queryFn: async () => {
      const { data } = await supabase
        .from("owner_verifications")
        .select("id, verification_status, created_at")
        .eq("vin_id", vinId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

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
  const hasPendingClaim = myPendingVerification?.verification_status === "pending";

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
              ) : hasPendingClaim ? (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  <Clock className="w-3 h-3 mr-1" />
                  Revendication en cours de vérification
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

      {/* No owner yet — invitation OR pending state */}
      {!hasAnyOwner ? (
        hasPendingClaim ? (
          <Card className="p-8 text-center border-dashed border-amber-300 bg-amber-50/50">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-amber-700" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              Votre revendication est en cours de vérification
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Notre équipe examine actuellement le document que vous avez fourni. Vous serez notifié
              dès que votre statut de propriétaire sera confirmé.
            </p>
          </Card>
        ) : (
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
        )
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
  const photos = allEvidence.filter(isVehiclePhotoEvidence);
  const docs = allEvidence.filter(isDocumentEvidence);

  const displayName = contributor?.is_anonymous
    ? "Propriétaire (anonyme)"
    : contributor?.display_name ?? "Propriétaire";
  const roleLabel = contributor ? ROLE_LABELS[contributor.role] ?? "Propriétaire" : "Propriétaire";
  const eventLabel = EVENT_TYPE_LABELS[ewf.event.event_type] ?? "Autre";
  const dateLabel = formatDate(ewf.event.event_date);
  const content = ownerFact?.fact.content ?? ewf.event.description ?? "";

  const askingPrice = (ewf.event as any).asking_price as number | null | undefined;

  return (
    <Card
      className={cn(
        "p-0 cursor-pointer transition-all hover:shadow-md overflow-hidden border-l-[3px] border-l-[hsl(170,70%,35%)]",
        isActive ? "shadow-md ring-1 ring-[hsl(170,70%,35%)]/40" : ""
      )}
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row">
        {/* LEFT — Metadata block (30%) */}
        <div className="sm:w-[34%] sm:max-w-[220px] p-4 flex flex-col gap-2 border-b sm:border-b-0 sm:border-r border-border/60 bg-[hsl(170,55%,97%)]">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarFallback className="bg-[hsl(170,55%,88%)] text-[hsl(170,70%,25%)] text-[11px] font-semibold">
                {contributor?.is_anonymous ? "?" : initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{roleLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge className={cn(
              "text-[10px] h-4 px-1.5",
              isVerified
                ? "bg-[hsl(170,70%,35%)] text-white hover:bg-[hsl(170,70%,30%)]"
                : "bg-[hsl(170,40%,90%)] text-[hsl(170,70%,25%)] hover:bg-[hsl(170,40%,85%)]"
            )}>
              {isVerified && <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />}
              Propriétaire
            </Badge>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium">{eventLabel}</Badge>
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
            <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2 flex-1">{content}</p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic flex-1">Aucune description</p>
          )}

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3">
              {photos.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="relative w-14 h-14 rounded-md overflow-hidden border border-[hsl(170,40%,80%)] bg-muted flex-shrink-0"
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
                <div className="w-14 h-14 rounded-md border border-[hsl(170,40%,80%)] bg-[hsl(170,40%,92%)] flex items-center justify-center text-xs font-semibold text-[hsl(170,70%,30%)] flex-shrink-0">
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
            <span className="inline-flex items-center gap-1 text-xs text-[hsl(170,70%,30%)] font-medium">
              Lire la suite
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
