import { useState, useEffect, useCallback } from "react";
import {
  X, FileText, Image, Film, Paperclip, Download, Lock,
  Shield, User, ChevronRight, Eye, Loader2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProofTierBadge } from "@/components/vin/ProofTierBadge";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { DocumentViewer } from "@/components/DocumentViewer";
import { supabase } from "@/integrations/supabase/client";
import type { Event, FactWithEvidence, Contributor, Evidence } from "@/hooks/useVinDossier";
import type { Enums } from "@/integrations/supabase/types";

// ── Props ───────────────────────────────────────────────

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fact: FactWithEvidence;
  contributor: Contributor;
  event: Event;
  siblingFacts?: FactWithEvidence[];
  onSiblingClick?: (factId: string) => void;
}

// ── Config ──────────────────────────────────────────────

const EVIDENCE_LABELS: Record<string, string> = {
  photo: "Photo",
  document: "Document",
  invoice: "Facture",
  inspection_report: "Rapport d'inspection",
  insurance_doc: "Document d'assurance",
  registration: "Certificat d'immatriculation",
  listing_screenshot: "Capture d'annonce",
  video: "Vidéo",
  other: "Autre",
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

const EVENT_LABELS: Record<string, string> = {
  purchase: "Achat", sale: "Vente", accident: "Accident", repair: "Réparation",
  maintenance: "Entretien", inspection: "Inspection", modification: "Modification",
  recall: "Rappel", insurance_claim: "Réclamation", listing: "Mise en vente",
  import_export: "Import/Export", registration: "Immatriculation",
  mileage_record: "Relevé km", other: "Autre",
};

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif"];
const PDF_EXTS = ["pdf"];
const VIDEO_EXTS = ["mp4", "mov", "webm"];

function getFileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isImage(e: Evidence): boolean {
  return IMAGE_EXTS.includes(getFileExt(e.file_name)) || e.file_type.startsWith("image/");
}

function isPdf(e: Evidence): boolean {
  return PDF_EXTS.includes(getFileExt(e.file_name)) || e.file_type === "application/pdf";
}

function isVideo(e: Evidence): boolean {
  return VIDEO_EXTS.includes(getFileExt(e.file_name)) || e.file_type.startsWith("video/");
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveUrl(filePath: string, bucket: string): string {
  if (filePath.startsWith("http")) return filePath;
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

// ── Evidence card ───────────────────────────────────────

function EvidenceCard({
  evidence,
  onViewPhoto,
  onViewDoc,
}: {
  evidence: Evidence;
  onViewPhoto: () => void;
  onViewDoc: () => void;
}) {
  const label = EVIDENCE_LABELS[evidence.evidence_type] ?? "Pièce";

  if (evidence.is_redacted) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock size={14} />
          <span className="text-sm font-medium">[Information sensible masquée]</span>
        </div>
      </div>
    );
  }

  const url = resolveUrl(evidence.file_path, "vin-documents");
  const isImg = isImage(evidence);
  const isDoc = isPdf(evidence);
  const isVid = isVideo(evidence);

  const IconComp = isImg ? Image : isVid ? Film : FileText;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Thumbnail for images */}
      {isImg && (
        <button onClick={onViewPhoto} className="w-full block">
          <div className="relative aspect-video bg-muted">
            <img
              src={url}
              alt={evidence.description ?? evidence.file_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
              <Eye size={24} className="text-white opacity-0 hover:opacity-100 drop-shadow transition-opacity" />
            </div>
          </div>
        </button>
      )}

      <div className="p-3 space-y-1.5">
        {/* File info */}
        <div className="flex items-start gap-2">
          <IconComp size={16} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{evidence.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {label}
              {evidence.file_size ? ` · ${formatFileSize(evidence.file_size)}` : ""}
            </p>
          </div>
        </div>

        {/* Description */}
        {evidence.description && (
          <p className="text-xs text-muted-foreground italic pl-6">
            "{evidence.description}"
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pl-6">
          {isImg && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onViewPhoto}>
              <Eye size={12} className="mr-1" /> Voir
            </Button>
          )}
          {isDoc && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onViewDoc}>
              <Eye size={12} className="mr-1" /> Voir
            </Button>
          )}
          {isVid && (
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Film size={12} className="mr-1" /> Lire
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────

export function EvidenceDrawer({
  isOpen,
  onClose,
  fact,
  contributor,
  event,
  siblingFacts = [],
  onSiblingClick,
}: EvidenceDrawerProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Evidence | null>(null);

  // Photos for lightbox
  const photoEvidence = fact.evidence.filter((e) => isImage(e) && !e.is_redacted);
  const lightboxPhotos = photoEvidence.map((e) => ({
    id: e.id,
    url: resolveUrl(e.file_path, "vin-documents"),
    caption: e.description,
  }));

  const openPhoto = useCallback((evidence: Evidence) => {
    const idx = photoEvidence.findIndex((p) => p.id === evidence.id);
    setLightboxIndex(Math.max(0, idx));
    setLightboxOpen(true);
  }, [photoEvidence]);

  const openDoc = useCallback((evidence: Evidence) => {
    setSelectedDoc(evidence);
    setDocViewerOpen(true);
  }, []);

  const role = contributor?.role ? ROLE_LABELS[contributor.role] ?? contributor.role : "Contributeur";
  const eventLabel = EVENT_LABELS[event.event_type] ?? event.event_type;
  const otherFacts = siblingFacts.filter((f) => f.fact.id !== fact.fact.id);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="right"
          className="w-full sm:w-[50vw] sm:max-w-2xl p-0 flex flex-col"
        >
          <SheetHeader className="px-4 py-3 border-b border-border flex-shrink-0">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Paperclip size={16} />
              Pièces justificatives
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-4 py-4 space-y-5">
              {/* Event context */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Événement : <span className="font-medium text-foreground">{eventLabel}</span>
                  {event.event_date && ` (${formatDate(event.event_date)})`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fait déposé par : <span className="font-medium text-foreground">{role}</span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Niveau :</span>
                  {fact.fact.proof_tier && (
                    <ProofTierBadge tier={fact.fact.proof_tier} size="sm" />
                  )}
                </div>
              </div>

              <Separator />

              {/* Fact content */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Contenu du fait
                </p>
                <p className="text-sm leading-relaxed text-foreground/90 bg-muted/30 rounded-md p-3">
                  {fact.fact.content}
                </p>
                {fact.fact.source_url && (
                  <a
                    href={fact.fact.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    Source externe →
                  </a>
                )}
              </div>

              <Separator />

              {/* Evidence list */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Pièces jointes ({fact.evidence.length})
                </p>

                {fact.evidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Aucune pièce jointe pour ce fait.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {fact.evidence.map((ev) => (
                      <EvidenceCard
                        key={ev.id}
                        evidence={ev}
                        onViewPhoto={() => openPhoto(ev)}
                        onViewDoc={() => openDoc(ev)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Contributor metadata */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Métadonnées
                </p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p>
                    Déposé le : <span className="text-foreground">{formatDate(fact.fact.created_at)}</span>
                  </p>
                  {contributor.display_name && (
                    <p>
                      Contributeur : <span className="text-foreground">{contributor.display_name}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span>Rôle :</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {role}
                    </Badge>
                  </div>
                  {contributor.facts_count != null && (
                    <p>
                      Contributions : <span className="text-foreground">{contributor.facts_count} fait{(contributor.facts_count ?? 0) > 1 ? "s" : ""}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span>Face :</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {fact.fact.face === "face_b" ? "Face B (propriétaire)" : "Face A (communauté)"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Sibling facts */}
              {otherFacts.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Autres faits sur cet événement
                    </p>
                    <div className="space-y-1">
                      {otherFacts.map((sf) => {
                        const sfRole = sf.contributor?.role
                          ? ROLE_LABELS[sf.contributor.role] ?? sf.contributor.role
                          : "Contributeur";
                        return (
                          <button
                            key={sf.fact.id}
                            onClick={() => onSiblingClick?.(sf.fact.id)}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 transition-colors flex items-start gap-2 group"
                          >
                            <User size={13} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-clamp-2">{sf.fact.content}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {sf.fact.proof_tier && (
                                  <ProofTierBadge tier={sf.fact.proof_tier} size="xs" showLabel={false} />
                                )}
                                <span className="text-[10px] text-muted-foreground">{sfRole}</span>
                              </div>
                            </div>
                            <ChevronRight
                              size={14}
                              className="mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Photo lightbox */}
      <PhotoLightbox
        photos={lightboxPhotos}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Document viewer */}
      {selectedDoc && (
        <DocumentViewer
          doc={{
            id: selectedDoc.id,
            fileName: selectedDoc.file_name,
            filePath: selectedDoc.file_path,
            fileType: selectedDoc.file_type,
            fileSize: selectedDoc.file_size,
            description: selectedDoc.description,
          }}
          open={docViewerOpen}
          onOpenChange={setDocViewerOpen}
        />
      )}
    </>
  );
}
