import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  url: string;
  caption?: string | null;
  fileName: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  className?: string;
}

const MAX_VISIBLE = 3;

export const PhotoGallery = ({ photos, className }: PhotoGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (photos.length === 0) return null;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  };

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    if (e.key === "ArrowRight") setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const displayPhotos = photos.slice(0, MAX_VISIBLE);
  const remainingCount = photos.length - MAX_VISIBLE;

  return (
    <>
      {/* Compact Thumbnail Strip */}
      <div className={cn("flex items-center gap-2", className)}>
        {displayPhotos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(index)}
            className="relative group overflow-hidden rounded-lg w-[140px] h-[100px] flex-shrink-0 bg-muted border border-border/30 transition-all hover:ring-2 hover:ring-primary/50 hover:border-primary/40"
          >
            <img
              src={photo.url}
              alt={photo.caption || photo.fileName}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center">
              <ZoomIn className="w-4 h-4 text-foreground opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
            </div>
          </button>
        ))}

        {/* +N badge */}
        {remainingCount > 0 && (
          <button
            onClick={() => openLightbox(MAX_VISIBLE)}
            className="flex flex-col items-center justify-center w-[140px] h-[100px] flex-shrink-0 rounded-lg bg-muted/50 border border-border/30 hover:border-primary/40 hover:bg-muted transition-all"
          >
            <ImageIcon className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-sm font-semibold text-foreground">
              +{remainingCount}
            </span>
            <span className="text-[10px] text-muted-foreground">photos</span>
          </button>
        )}
      </div>

      {/* Photo count label */}
      <button
        onClick={() => openLightbox(0)}
        className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
      >
        <ImageIcon className="w-3 h-3" />
        Voir {photos.length > 1 ? `les ${photos.length} photos` : "la photo"}
      </button>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Galerie photos"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>

          {photos.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[currentIndex].url}
              alt={photos[currentIndex].caption || photos[currentIndex].fileName}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
            {photos[currentIndex].caption && (
              <p className="mt-4 text-center text-foreground/80 max-w-lg">
                {photos[currentIndex].caption}
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {currentIndex + 1} / {photos.length}
            </p>
          </div>

          {photos.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              aria-label="Photo suivante"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={cn(
                    "w-16 h-12 rounded-md overflow-hidden flex-shrink-0 transition-all",
                    index === currentIndex
                      ? "ring-2 ring-primary opacity-100"
                      : "opacity-50 hover:opacity-75"
                  )}
                >
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
