import { useEffect, useMemo, useRef, useState } from "react";
import { X, Calendar, Gauge, FileText, Download, ExternalLink, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { EventWithFacts, FactWithEvidence, Evidence } from "@/hooks/useVinDossier";

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
  purchase: "Achat", sale: "Vente", accident: "Accident", repair: "Réparation",
  maintenance: "Entretien", inspection: "Inspection", modification: "Modification",
  recall: "Rappel", insurance_claim: "Réclamation d'assurance", listing: "Mise en vente",
  import_export: "Import / Export", registration: "Immatriculation",
  mileage_record: "Relevé kilométrique", other: "Autre",
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
  return supabase.storage.from("vin-photos").getPublicUrl(path).data.publicUrl;
}
function docUrl(path: string) {
  return supabase.storage.from("vin-documents").getPublicUrl(path).data.publicUrl;
}
function initials(name: string | null | undefined, fallback = "?") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function formatDate(d: string | null | undefined) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return null; }
}
function formatMonthYear(d: string | null | undefined) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString("fr-CA", { month: "long", year: "numeric" }); }
  catch { return null; }
}

export interface ProfileMeta {
  created_at: string;
  vins_contributed_to: number | null;
}

interface ContributionDetailPanelProps {
  ewf: EventWithFacts | null;
  open: boolean;
  onClose: () => void;
  profiles: Record<string, ProfileMeta>;
}

export function ContributionDetailPanel({ ewf, open, onClose, profiles }: ContributionDetailPanelProps) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Mobile drag-to-close
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lightboxOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, lightboxOpen]);

  // Aggregate photos across all facts (for lightbox indexing)
  const allPhotos = useMemo(() => {
    if (!ewf) return [];
    return ewf.facts.flatMap((fw) =>
      fw.evidence.filter(isPhoto).map((ev) => ({
        id: ev.id,
        url: photoUrl(ev.file_path),
        caption: ev.description ?? null,
      }))
    );
  }, [ewf]);

  function openLightboxAt(evidenceId: string) {
    const idx = allPhotos.findIndex((p) => p.id === evidenceId);
    setLightboxIndex(Math.max(0, idx));
    setLightboxOpen(true);
  }

  function handleTouchStart(e: React.TouchEvent) {
    dragStart.current = e.touches[0].clientY;
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (dragStart.current == null) return;
    const dy = e.touches[0].clientY - dragStart.current;
    if (dy > 0) setDragY(dy);
  }
  function handleTouchEnd() {
    if (dragY > 120) onClose();
    setDragY(0);
    dragStart.current = null;
  }

  // Reset drag when reopening
  useEffect(() => { if (!open) setDragY(0); }, [open]);

  if (!ewf && !open) return null;

  // Identify primary fact and additional facts
  const facts = ewf?.facts ?? [];
  const primaryFact = facts.find((f) => f.fact.content?.trim().length) ?? facts[0];
  const otherFacts = facts.filter((f) => f !== primaryFact);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onClose}
        />
      )}

      {/* Desktop click-outside backdrop (transparent, only catches clicks) */}
      {!isMobile && open && (
        <div
          className="fixed inset-0 z-30"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        ref={panelRef}
        className={cn(
          "fixed z-40 bg-background border-border shadow-2xl transition-transform duration-300 ease-out flex flex-col",
          isMobile
            ? "left-0 right-0 bottom-0 h-[90vh] rounded-t-2xl border-t"
            : "top-16 right-0 bottom-0 w-[45%] max-w-[640px] border-l"
        )}
        style={
          isMobile
            ? {
                transform: open
                  ? `translateY(${dragY}px)`
                  : "translateY(100%)",
                transition: dragStart.current != null ? "none" : "transform 300ms ease-out",
              }
            : { transform: open ? "translateX(0)" : "translateX(100%)" }
        }
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grip */}
        {isMobile && (
          <div
            className="pt-2 pb-1 flex justify-center cursor-grab active:cursor-grabbing flex-shrink-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Close button */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <h3 className="font-semibold text-sm text-foreground">Détails de la contribution</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {ewf && primaryFact && (
            <FactBlock
              ewf={ewf}
              fact={primaryFact}
              isPrimary
              profiles={profiles}
              onPhotoClick={openLightboxAt}
            />
          )}

          {otherFacts.length > 0 && (
            <div className="pt-3 border-t border-border space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Autres contributions sur cet événement
              </h4>
              {otherFacts.map((fw) => (
                <FactBlock
                  key={fw.fact.id}
                  ewf={ewf!}
                  fact={fw}
                  isPrimary={false}
                  profiles={profiles}
                  onPhotoClick={openLightboxAt}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      <PhotoLightbox
        photos={allPhotos}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

// ── Fact block ──────────────────────────────────────────

function FactBlock({
  ewf,
  fact,
  isPrimary,
  profiles,
  onPhotoClick,
}: {
  ewf: EventWithFacts;
  fact: FactWithEvidence;
  isPrimary: boolean;
  profiles: Record<string, ProfileMeta>;
  onPhotoClick: (evidenceId: string) => void;
}) {
  const contributor = fact.contributor;
  const profile = contributor?.user_id ? profiles[contributor.user_id] : undefined;
  const displayName = contributor?.is_anonymous
    ? "Anonyme"
    : contributor?.display_name ?? "Contributeur";
  const roleLabel = contributor ? ROLE_LABELS[contributor.role] ?? "Contributeur" : "Contributeur";
  const memberSince = profile && !contributor?.is_anonymous ? formatMonthYear(profile.created_at) : null;
  const dossiersCount = profile && !contributor?.is_anonymous ? profile.vins_contributed_to ?? 0 : null;

  const photos = fact.evidence.filter(isPhoto);
  const docs = fact.evidence.filter(isDoc);

  return (
    <div className="space-y-3">
      {/* Contributor header */}
      <div className="flex items-start gap-3">
        <Avatar className="w-11 h-11 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {contributor?.is_anonymous ? "?" : initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-sm text-foreground truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground">· {roleLabel}</span>
          </div>
          {(memberSince || (dossiersCount != null && dossiersCount > 0)) && (
            <div className="flex flex-wrap gap-x-2 mt-0.5 text-[11px] text-muted-foreground">
              {memberSince && <span>Membre depuis {memberSince}</span>}
              {memberSince && dossiersCount != null && dossiersCount > 0 && <span>·</span>}
              {dossiersCount != null && dossiersCount > 0 && (
                <span>{dossiersCount} dossier{dossiersCount > 1 ? "s" : ""} contribué{dossiersCount > 1 ? "s" : ""}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Event meta (only for primary block) */}
      {isPrimary && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-medium">
            {EVENT_TYPE_LABELS[ewf.event.event_type] ?? "Autre"}
          </Badge>
          {ewf.event.event_date && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {formatDate(ewf.event.event_date)}
            </span>
          )}
          {ewf.event.mileage_at_event != null && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Gauge className="w-3 h-3" />
              {ewf.event.mileage_at_event.toLocaleString("fr-CA")} km
            </span>
          )}
        </div>
      )}

      {/* Title for primary */}
      {isPrimary && ewf.event.title && (
        <h2 className="font-display text-lg font-bold text-foreground leading-tight">
          {ewf.event.title}
        </h2>
      )}

      {/* Full content */}
      {fact.fact.content && (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
          {fact.fact.content}
        </p>
      )}

      {/* Photos grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => onPhotoClick(p.id)}
              className="aspect-[4/3] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors group"
            >
              <img
                src={photoUrl(p.file_path)}
                alt={p.description ?? p.file_name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </button>
          ))}
        </div>
      )}

      {/* Documents */}
      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((d) => (
            <DocumentItem key={d.id} doc={d} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!fact.fact.content && photos.length === 0 && docs.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Aucun contenu fourni.</p>
      )}
    </div>
  );
}

function DocumentItem({ doc }: { doc: Evidence }) {
  const url = docUrl(doc.file_path);
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/40">
      <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
        {doc.description && (
          <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label="Ouvrir">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
        <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label="Télécharger">
          <a href={url} download={doc.file_name}>
            <Download className="w-4 h-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
