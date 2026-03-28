import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "@/components/PhotoGallery";
import { supabase } from "@/integrations/supabase/client";
import type { PublicContribution, ContributionType, ContributionDocument } from "@/hooks/useVINData";
import {
  FileSearch, FileText, MessageCircle, Wrench, Camera, Eye, XCircle,
  Calendar, User, CheckCircle, ChevronDown, ChevronUp, File, ExternalLink
} from "lucide-react";
import { RefreshCw, Tag } from "lucide-react";

const getContributionIcon = (type: ContributionType) => {
  switch (type) {
    case "inspection_report": return FileSearch;
    case "vehicle_history": return FileText;
    case "owner_exchange": return MessageCircle;
    case "mechanic_conversation": return Wrench;
    case "photo_evidence": return Camera;
    case "observation": return Eye;
    case "purchase_decision": return XCircle;
    case "ownership_change": return RefreshCw;
    case "for_sale": return Tag;
    case "price_change": return Tag;
    default: return FileText;
  }
};

const getContributionLabel = (type: ContributionType) => {
  switch (type) {
    case "inspection_report": return "Rapport d'inspection";
    case "vehicle_history": return "Historique véhicule";
    case "owner_exchange": return "Échange avec vendeur";
    case "mechanic_conversation": return "Avis mécanicien";
    case "photo_evidence": return "Photos";
    case "observation": return "Observation";
    case "purchase_decision": return "Décision d'achat";
    case "ownership_change": return "Changement de propriétaire";
    case "for_sale": return "Mise en vente";
    case "price_change": return "Modification de prix";
    default: return "Contribution";
  }
};

const getContributionColor = (type: ContributionType) => {
  switch (type) {
    case "inspection_report": return "bg-primary/10 text-primary border-primary/20";
    case "vehicle_history": return "bg-primary/10 text-primary border-primary/20";
    case "owner_exchange": return "bg-accent text-accent-foreground border-accent-foreground/20";
    case "mechanic_conversation": return "bg-warning/10 text-warning border-warning/20";
    case "photo_evidence": return "bg-success/10 text-success border-success/20";
    case "observation": return "bg-muted text-muted-foreground border-border";
    case "purchase_decision": return "bg-muted text-muted-foreground border-border";
    case "ownership_change": return "bg-primary/10 text-primary border-primary/20";
    case "for_sale": return "bg-warning/10 text-warning border-warning/20";
    case "price_change": return "bg-accent text-accent-foreground border-accent-foreground/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const TEXT_TRUNCATE_LENGTH = 300;

interface ContributionCardProps {
  contribution: PublicContribution;
  adminActions?: React.ReactNode;
  compact?: boolean;
}

export function ContributionCard({ contribution, adminActions, compact }: ContributionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getContributionIcon(contribution.type);

  const fullText = contribution.details || contribution.summaryPublic || "";
  const summaryText = contribution.summaryPublic || "";
  const isLongText = fullText.length > TEXT_TRUNCATE_LENGTH;
  const displayText = expanded ? fullText : fullText.slice(0, TEXT_TRUNCATE_LENGTH);

  return (
    <div className="rounded-lg bg-muted/30 border border-border hover:border-primary/20 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge variant="outline" className={`text-xs ${getContributionColor(contribution.type)}`}>
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{contribution.author}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {contribution.interventionDate || contribution.date}
            </span>
            {contribution.mileageAtIntervention && contribution.type !== "ownership_change" && (
              <>
                <span>·</span>
                <span>{contribution.mileageAtIntervention.toLocaleString()} km</span>
              </>
            )}
            {contribution.province && contribution.type !== "ownership_change" && (
              <>
                <span>·</span>
                <span>{contribution.province}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title — show title, or fallback to summary as title if no title exists */}
      {(title || (!title && summary)) && (
        <h3 className="text-sm font-semibold text-foreground mt-2">
          {title || summary}
        </h3>
      )}

      {/* Content — only body text that differs from the title */}
      {!compact && displayText && renderTextContent(contribution, displayText, expanded)}

      {/* Read more */}
      {!compact && isLongText && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Réduire</> : <><ChevronDown className="w-3 h-3" /> Lire plus</>}
        </button>
      )}

      {/* Photos */}
      {!compact && contribution.hasPhotos && contribution.photos.length > 0 && (
        <div className="mt-3">
          <PhotoGallery photos={contribution.photos} />
        </div>
      )}

      {/* Documents */}
      {!compact && contribution.hasDocuments && contribution.documents.length > 0 && (
        <DocumentsList documents={contribution.documents} />
      )}

      {adminActions}
    </div>
  );
}


function DocumentsList({ documents }: { documents: ContributionDocument[] }) {
  const handleOpenDocument = useCallback(async (doc: ContributionDocument) => {
    if (!doc.filePath) return;
    const { data, error } = await supabase.storage
      .from("vin-documents")
      .createSignedUrl(doc.filePath, 3600);
    if (error || !data?.signedUrl) {
      const { data: publicData } = supabase.storage
        .from("vin-documents")
        .getPublicUrl(doc.filePath);
      if (publicData?.publicUrl) {
        window.open(publicData.publicUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documents</p>
      {documents.map(doc => (
        <button
          key={doc.id}
          onClick={() => doc.filePath && handleOpenDocument(doc)}
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
      ))}
    </div>
  );
}

function renderTextContent(
  contribution: PublicContribution,
  displayText: string,
  summaryText: string,
  expanded: boolean
) {
  const { type } = contribution;

  if (type === "observation" || type === "owner_exchange" || type === "mechanic_conversation") {
    if (!displayText && !summaryText) return null;
    return (
      <div className="mt-2">
        {summaryText && summaryText !== displayText && (
          <p className="text-sm text-foreground/90 mb-1.5 whitespace-pre-line">{summaryText}</p>
        )}
        {displayText && (
          <blockquote className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3 italic leading-relaxed whitespace-pre-line">
            {displayText}
          </blockquote>
        )}
      </div>
    );
  }

  if (type === "purchase_decision") {
    return summaryText ? (
      <div className="mt-2">
        <p className="text-sm text-foreground/90 whitespace-pre-line">
          {expanded ? (contribution.details || summaryText) : summaryText.slice(0, TEXT_TRUNCATE_LENGTH)}
        </p>
      </div>
    ) : null;
  }

  if (type === "ownership_change") {
    const holderLabel = contribution.holderType === "concessionnaire" && contribution.dealerName
      ? contribution.dealerName
      : contribution.holderType === "concessionnaire" ? "Concessionnaire"
      : contribution.holderType === "depot_vente" ? "Dépôt-vente"
      : contribution.holderType === "particulier" ? "Particulier"
      : null;

    let dateDisplay: string | null = null;
    if (contribution.interventionDate) {
      const d = new Date(contribution.interventionDate + "T00:00:00");
      const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
      dateDisplay = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }

    return (
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {summaryText && <p className="text-sm text-foreground/90 whitespace-pre-line">🔄 {summaryText}</p>}
        {dateDisplay && <p>{dateDisplay}</p>}
        {holderLabel && <p>Vendu par : <span className="text-foreground/80">{holderLabel}</span></p>}
        {contribution.province && <p>Province : <span className="text-foreground/80">{contribution.province}</span></p>}
        {contribution.mileageAtIntervention && <p>Kilométrage : <span className="text-foreground/80">{contribution.mileageAtIntervention.toLocaleString()} km</span></p>}
        {contribution.details && <p className="italic whitespace-pre-line mt-1">{contribution.details}</p>}
      </div>
    );
  }

  if (type === "for_sale") {
    const holderLabel = contribution.holderType === "concessionnaire" && contribution.dealerName
      ? contribution.dealerName
      : contribution.holderType === "concessionnaire" ? "Concessionnaire"
      : contribution.holderType === "depot_vente" ? "Dépôt-vente"
      : contribution.holderType === "particulier" ? "Particulier"
      : null;

    return (
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {summaryText && <p className="text-sm text-foreground/90 whitespace-pre-line">🏷️ {summaryText}</p>}
        {holderLabel && <p>Vendeur : <span className="text-foreground/80">{holderLabel}</span></p>}
        {contribution.province && <p>Province : <span className="text-foreground/80">{contribution.province}</span></p>}
        {contribution.askingPrice && <p>Prix demandé : <span className="text-foreground/80 font-medium">{contribution.askingPrice.toLocaleString()} $</span></p>}
        {contribution.listingUrl && (
          <p><a href={contribution.listingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Voir l'annonce ↗</a></p>
        )}
        {contribution.details && <p className="italic whitespace-pre-line mt-1">{contribution.details}</p>}
      </div>
    );
  }

  if (type === "price_change") {
    const isPriceDrop = contribution.oldPrice && contribution.askingPrice && contribution.askingPrice < contribution.oldPrice;
    return (
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p className="text-sm text-foreground/90">💲 {isPriceDrop ? "Baisse de prix" : "Modification de prix"}</p>
        {(contribution.oldPrice || contribution.askingPrice) && (
          <p className="text-sm font-medium text-foreground">
            {contribution.oldPrice ? `${contribution.oldPrice.toLocaleString()} $` : "—"} → {contribution.askingPrice ? `${contribution.askingPrice.toLocaleString()} $` : "—"}
          </p>
        )}
        {summaryText && <p className="italic whitespace-pre-line">{summaryText}</p>}
      </div>
    );
  }

  if (type === "inspection_report" || type === "vehicle_history") {
    return (
      <div className="mt-2 space-y-1.5">
        {summaryText && <p className="text-sm text-foreground/90 whitespace-pre-line">{summaryText}</p>}
        {contribution.details && contribution.details !== summaryText && expanded && (
          <p className="text-sm text-muted-foreground whitespace-pre-line">{contribution.details}</p>
        )}
      </div>
    );
  }

  if (type === "photo_evidence") {
    return summaryText ? <p className="text-sm text-foreground/90 mt-2">{summaryText}</p> : null;
  }

  return summaryText ? <p className="text-sm text-foreground/90 mt-2 whitespace-pre-line">{summaryText}</p> : null;
}

export { getContributionIcon, getContributionLabel, getContributionColor };
