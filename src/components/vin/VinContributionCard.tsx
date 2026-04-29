import { Camera, FileText, ClipboardCheck, Gauge, ChevronRight, ShieldCheck, Pencil, ArrowLeftRight, KeyRound } from "lucide-react";
import { buildPhotoUrl } from "@/lib/photoUrl";
import { isDocumentEvidence, isVehiclePhotoEvidence } from "@/lib/mediaClassification";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EventWithFacts, FactWithEvidence } from "@/hooks/useVinDossier";
import { getMaintenanceData } from "@/lib/maintenanceLogTypes";
import { MaintenanceCardSummary } from "@/components/vin/MaintenanceCardSummary";

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

interface VinContributionCardProps {
  ewf: EventWithFacts;
  isActive: boolean;
  onClick: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  /** When true, prefer the owner fact as the primary display fact */
  preferOwnerFact?: boolean;
}

export function VinContributionCard({
  ewf,
  isActive,
  onClick,
  isAdmin,
  onEdit,
  preferOwnerFact = false,
}: VinContributionCardProps) {
  const ownerFact = preferOwnerFact
    ? ewf.facts.find((f) => f.contributor && ["owner_verified", "owner_unverified", "former_owner"].includes(f.contributor.role))
    : undefined;
  const primaryFact: FactWithEvidence | undefined =
    ownerFact ??
    ewf.facts.find((f) => f.fact.content && f.fact.content.trim().length > 0) ??
    ewf.facts[0];
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

  const isInspection = ewf.event.event_type === "inspection";
  const isPurchase = ewf.event.event_type === "purchase";
  const isSale = ewf.event.event_type === "sale";
  const isTransaction = isPurchase || isSale;
  const askingPrice = (ewf.event as unknown as { asking_price?: number | null }).asking_price;

  const borderClass = isTransaction
    ? "border-l-[5px] border-l-[hsl(35,85%,50%)]"
    : isOwnerContribution
      ? "border-l-[3px] border-l-[hsl(170,70%,35%)]"
      : isInspection
        ? "border-l-[3px] border-l-primary"
        : "border-l border-l-border";

  return (
    <Card
      className={cn(
        "relative p-0 cursor-pointer transition-all hover:shadow-md hover:border-primary/40 overflow-hidden",
        borderClass,
        isTransaction && "bg-[hsl(40,60%,98%)]",
        isActive && "shadow-md ring-1 ring-primary/30"
      )}
      onClick={onClick}
    >
      {isTransaction && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[hsl(35,85%,50%)]/10 border-b border-[hsl(35,85%,50%)]/20">
          {isPurchase ? (
            <KeyRound className="w-3.5 h-3.5 text-[hsl(35,85%,35%)]" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5 text-[hsl(35,85%,35%)]" />
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(35,85%,30%)]">
            {isPurchase ? "Achat — Changement de propriétaire" : "Vente — Changement de propriétaire"}
          </span>
        </div>
      )}

      {isAdmin && onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-md bg-background/90 border border-border text-muted-foreground hover:text-primary hover:border-primary/50 shadow-sm"
          title="Modifier (admin)"
          aria-label="Modifier la contribution (admin)"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="flex flex-col sm:flex-row">
        <div className={cn(
          "sm:w-[28%] sm:max-w-[180px] p-3 flex flex-col gap-2 border-b sm:border-b-0 sm:border-r border-border/60",
          isTransaction
            ? "bg-[hsl(40,70%,95%)]"
            : isOwnerContribution ? "bg-[hsl(170,55%,97%)]" : isInspection ? "bg-primary/5" : "bg-muted/30"
        )}>
          <div className="flex items-center gap-2.5">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarFallback className={cn(
                "text-[11px] font-semibold",
                isTransaction
                  ? "bg-[hsl(35,85%,85%)] text-[hsl(35,85%,30%)]"
                  : isOwnerContribution
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
            {showEventBadge && !isTransaction && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium">
                {eventLabel}
              </Badge>
            )}
            {isTransaction && (
              <Badge className="text-[10px] h-4 px-1.5 bg-[hsl(35,85%,50%)] text-white hover:bg-[hsl(35,85%,45%)] font-semibold">
                {isPurchase ? "ACHAT" : "VENTE"}
              </Badge>
            )}
          </div>

          {dateLabel && (
            <div className="mt-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Date</p>
              <p className={cn(
                "font-display font-bold text-foreground leading-tight",
                isTransaction ? "text-sm" : "text-base"
              )}>{dateLabel}</p>
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
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                    {isTransaction ? "Prix déclaré" : "Prix"}
                  </p>
                  <p className={cn(
                    "text-sm font-semibold tabular-nums",
                    isTransaction ? "text-[hsl(35,85%,30%)]" : "text-foreground"
                  )}>
                    {askingPrice.toLocaleString("fr-CA")} $
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col min-w-0">
          {(() => {
            const maintenance = primaryFact ? getMaintenanceData(primaryFact.fact.metadata) : null;
            const title = ewf.event.title?.trim() || "";
            const bodyClean = content.split("\n\n— Détails de la transaction —")[0].trim();
            const hasTitle = title.length > 0;
            const titleText = hasTitle ? title : (bodyClean.split("\n").slice(0, 2).join(" ") || "Sans titre");
            return (
              <>
                <h3 className="font-display font-semibold text-[15px] text-foreground leading-snug line-clamp-2">
                  {titleText}
                </h3>
                {hasTitle && bodyClean && !maintenance && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-1.5">
                    {bodyClean}
                  </p>
                )}
                {!hasTitle && !bodyClean && !maintenance && (
                  <p className="text-sm text-muted-foreground/60 italic mt-1.5">Aucune description</p>
                )}
                {maintenance && <MaintenanceCardSummary data={maintenance} />}
              </>
            );
          })()}

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
                  <span>photo{photos.length > 1 ? "s" : ""}</span>
                </span>
              )}
              {docs.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="tabular-nums font-medium">{docs.length}</span>
                  <span>document{docs.length > 1 ? "s" : ""}</span>
                </span>
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
