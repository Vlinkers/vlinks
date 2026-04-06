import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "@/components/PhotoGallery";
import { supabase } from "@/integrations/supabase/client";
import type { PublicContribution, ContributionDocument } from "@/hooks/useVINData";
import { getContributionIcon, getContributionLabel, getContributionBadgeVariant } from "@/components/ContributionCard";
import { Calendar, User, CheckCircle, File, ExternalLink, MapPin } from "lucide-react";
import { useCallback, useEffect } from "react";

interface ContributionDetailDrawerProps {
  contribution: PublicContribution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminActions?: React.ReactNode;
  isActiveVlinker?: boolean;
}

export function ContributionDetailDrawer({ contribution, open, onOpenChange, adminActions, isActiveVlinker }: ContributionDetailDrawerProps) {
  // Close on browser back
  useEffect(() => {
    if (!open) return;
    const onPop = () => onOpenChange(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, onOpenChange]);

  if (!contribution) return null;

  const Icon = getContributionIcon(contribution.type);
  const title = contribution.title || contribution.summaryPublic || getContributionLabel(contribution.type);
  const details = contribution.details || "";
  const summary = contribution.summaryPublic || "";

  // Build body: details if different from title, else summary if different
  const bodyText = details && details !== title
    ? details
    : summary && summary !== title
    ? summary
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={getContributionBadgeVariant(contribution.type)} className="text-xs">
              <Icon className="w-3 h-3 mr-1" />
              {getContributionLabel(contribution.type)}
            </Badge>
            {contribution.isOwnerContribution && (
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                <User className="w-3 h-3 mr-1" />
                Propriétaire
              </Badge>
            )}
            {contribution.authorVerified && (
              <Badge variant="outline" className="text-xs bg-success/5 text-success border-success/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Vérifié
              </Badge>
            )}
          </div>
          <SheetTitle className="text-lg font-display font-bold text-foreground text-left">
            {title}
          </SheetTitle>
        </SheetHeader>

        <div className="py-5 space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {contribution.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {contribution.interventionDate || contribution.date}
            </span>
            {contribution.mileageAtIntervention && (
              <span>{contribution.mileageAtIntervention.toLocaleString()} km</span>
            )}
            {contribution.province && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {contribution.province}
              </span>
            )}
          </div>

          {/* Type-specific details */}
          {contribution.type === "for_sale" && (
            <div className="space-y-1 text-sm text-muted-foreground">
              {contribution.askingPrice && <p>Prix demandé : <span className="text-foreground font-medium">{contribution.askingPrice.toLocaleString()} $</span></p>}
              {contribution.listingUrl && (
                <p><a href={contribution.listingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Voir l'annonce ↗</a></p>
              )}
            </div>
          )}

          {contribution.type === "price_change" && (contribution.oldPrice || contribution.askingPrice) && (
            <div className="text-sm">
              <p className="text-foreground font-medium">
                {contribution.oldPrice ? `${contribution.oldPrice.toLocaleString()} $` : "—"} → {contribution.askingPrice ? `${contribution.askingPrice.toLocaleString()} $` : "—"}
              </p>
            </div>
          )}

          {/* Body text */}
          {bodyText && (
            <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
              {bodyText}
            </div>
          )}

          {/* Photos in 2-column grid */}
          {contribution.hasPhotos && contribution.photos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Photos ({contribution.photos.length})</p>
              <PhotoGallery photos={contribution.photos} />
            </div>
          )}

          {/* Documents */}
          {contribution.hasDocuments && contribution.documents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Documents ({contribution.documents.length})</p>
              <div className="space-y-1.5">
                {contribution.documents.map(doc => (
                  <DrawerDocRow key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          )}

          {/* Admin actions */}
          {adminActions}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerDocRow({ doc }: { doc: ContributionDocument }) {
  const handleOpen = useCallback(() => {
    if (!doc.filePath) return;
    const { data } = supabase.storage.from("vin-documents").getPublicUrl(doc.filePath);
    if (data?.publicUrl) window.open(data.publicUrl, "_blank");
  }, [doc.filePath]);

  return (
    <button
      onClick={handleOpen}
      disabled={!doc.filePath}
      className="w-full flex items-center gap-3 p-2.5 rounded-md border border-border text-left hover:bg-muted/50 transition-colors group"
    >
      <File className="w-4 h-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{doc.fileName}</p>
        {doc.fileSize && <p className="text-[10px] text-muted-foreground">{(doc.fileSize / 1024).toFixed(0)} Ko</p>}
      </div>
      <Badge variant="outline" className="text-[10px]">{doc.fileType?.split("/").pop()?.toUpperCase() || "DOC"}</Badge>
      {doc.filePath && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />}
    </button>
  );
}
