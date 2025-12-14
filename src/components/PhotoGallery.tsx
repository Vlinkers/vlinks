import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
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

  // Show grid preview (max 4 thumbnails)
  const displayPhotos = photos.slice(0, 4);
  const remainingCount = photos.length - 4;

  return (
    <>
      {/* Thumbnail Grid */}
      <div className={cn("grid gap-2", className, {
        "grid-cols-2": photos.length >= 2,
        "grid-cols-1": photos.length === 1,
      })}>
        {displayPhotos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(index)}
            className={cn(
              "relative group overflow-hidden rounded-lg aspect-video bg-muted",
              "transition-all hover:ring-2 hover:ring-primary/50",
              index === 0 && photos.length > 2 && "col-span-2"
            )}
          >
            <img
              src={photo.url}
              alt={photo.caption || photo.fileName}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {index === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <span className="font-display text-xl font-bold text-foreground">
                  +{remainingCount}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

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
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation - Previous */}
          {photos.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Main Image */}
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

          {/* Navigation - Next */}
          {photos.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              aria-label="Photo suivante"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Thumbnail Strip */}
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
