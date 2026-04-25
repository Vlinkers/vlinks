import { useEffect, useMemo, useState } from "react";
import { Camera, Plus, X, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { buildPhotoUrl } from "@/lib/photoUrl";
import { isVehiclePhotoEvidence } from "@/lib/mediaClassification";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VinDossier, Contributor } from "@/hooks/useVinDossier";

interface PhotosViewProps {
  dossier: VinDossier | null | undefined;
  onNavigate?: (view: string) => void;
}

interface PhotoItem {
  id: string;
  url: string;
  fileName: string;
  description: string | null;
  uploadedAt: string;
  contributor: Contributor | null;
  factContent: string;
  eventTitle: string;
}

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

// photoUrl now provided by shared buildPhotoUrl utility

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function contributorLabel(c: Contributor | null) {
  if (!c) return "Anonyme";
  if (c.is_anonymous) return "Anonyme";
  return c.display_name || ROLE_LABELS[c.role] || "Contributeur";
}

export function PhotosView({ dossier, onNavigate }: PhotosViewProps) {
  const [sortBy, setSortBy] = useState<"date" | "contributor">("date");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photos = useMemo<PhotoItem[]>(() => {
    if (!dossier) return [];
    const items: PhotoItem[] = [];
    for (const ewf of dossier.events) {
      for (const fw of ewf.facts) {
        for (const ev of fw.evidence) {
          if (!isVehiclePhotoEvidence(ev)) continue;
          items.push({
            id: ev.id,
            url: buildPhotoUrl(ev.file_path),
            fileName: ev.file_name,
            description: ev.description,
            uploadedAt: ev.created_at ?? ewf.event.event_date ?? "",
            contributor: fw.contributor,
            factContent: fw.fact.content,
            eventTitle: ewf.event.title,
          });
        }
      }
    }
    return items;
  }, [dossier]);

  const sorted = useMemo(() => {
    const arr = [...photos];
    if (sortBy === "date") {
      arr.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
    } else {
      arr.sort((a, b) =>
        contributorLabel(a.contributor).localeCompare(contributorLabel(b.contributor), "fr")
      );
    }
    return arr;
  }, [photos, sortBy]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex(i => i === null ? null : Math.max(0, i - 1));
      if (e.key === "ArrowRight") setLightboxIndex(i => i === null ? null : Math.min(sorted.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, sorted.length]);

  const current = lightboxIndex !== null ? sorted[lightboxIndex] : null;

  // ── Empty state ──
  if (sorted.length === 0) {
    return (
      <div className="animate-in fade-in duration-200">
        <header className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Photos</h2>
        </header>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Camera className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Aucune photo n'a été déposée pour ce véhicule.
          </p>
          <Button size="sm" onClick={() => onNavigate?.("contribute")}>
            <Plus className="w-4 h-4 mr-1.5" /> Ajouter des photos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-200">
      <header className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Photos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {sorted.length} photo{sorted.length > 1 ? "s" : ""} déposée{sorted.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={() => setSortBy("date")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border transition-colors",
              sortBy === "date"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}
          >
            Par date
          </button>
          <button
            onClick={() => setSortBy("contributor")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border transition-colors",
              sortBy === "contributor"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}
          >
            Par contributeur
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {sorted.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => setLightboxIndex(idx)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted hover:shadow-lg transition-all"
          >
            <img
              src={p.url}
              alt={p.description || p.fileName}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 py-1.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="font-medium truncate">{contributorLabel(p.contributor)}</p>
              <p className="text-white/70 truncate">{formatDate(p.uploadedAt)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {current && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-mono">
            {lightboxIndex + 1} / {sorted.length}
          </div>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Précédent"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}

          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <img
              src={current.url}
              alt={current.description || current.fileName}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain rounded"
            />
          </div>

          {lightboxIndex < sorted.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Suivant"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          )}

          <div
            className="bg-black/80 backdrop-blur-sm border-t border-white/10 px-4 py-3 text-white text-xs space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-3xl mx-auto">
              <p className="font-semibold text-sm">
                {contributorLabel(current.contributor)}
                <span className="text-white/50 font-normal"> · {formatDate(current.uploadedAt)}</span>
              </p>
              <p className="text-white/80 mt-0.5">
                <span className="text-white/50">Contribution :</span> {current.eventTitle}
              </p>
              {current.factContent && (
                <p className="text-white/70 mt-1 line-clamp-3">{current.factContent}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
