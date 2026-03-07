import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotoGallery } from "@/components/PhotoGallery";
import { supabase } from "@/integrations/supabase/client";
import type { PublicContribution, ContributionType, ContributionDocument } from "@/hooks/useVINData";
import {
  FileSearch, FileText, MessageCircle, Wrench, Camera, Eye, XCircle,
  Calendar, User, CheckCircle, ChevronDown, ChevronUp, Download, File, ExternalLink
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
    case "photo_evidence": return "Preuves photo";
    case "observation": return "Observation personnelle";
    case "purchase_decision": return "Décision d'achat";
    case "ownership_change": return "Changement de propriétaire";
    case "for_sale": return "Mise en vente";
    default: return "Contribution";
  }
};

const getContributionColor = (type: ContributionType) => {
  switch (type) {
    case "inspection_report": return "bg-primary/20 text-primary border-primary/30";
    case "vehicle_history": return "bg-secondary/20 text-secondary border-secondary/30";
    case "owner_exchange": return "bg-accent/20 text-accent border-accent/30";
    case "mechanic_conversation": return "bg-warning/20 text-warning border-warning/30";
    case "photo_evidence": return "bg-success/20 text-success border-success/30";
    case "observation": return "bg-danger/20 text-danger border-danger/30";
    case "purchase_decision": return "bg-muted text-muted-foreground border-border";
    case "ownership_change": return "bg-primary/20 text-primary border-primary/30";
    case "for_sale": return "bg-warning/20 text-warning border-warning/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const TEXT_TRUNCATE_LENGTH = 300;

interface ContributionCardProps {
  contribution: PublicContribution;
  adminActions?: React.ReactNode;
}

export function ContributionCard({ contribution, adminActions }: ContributionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getContributionIcon(contribution.type);

  const fullText = contribution.details || contribution.summaryPublic || "";
  const summaryText = contribution.summaryPublic || "";
  const isLongText = fullText.length > TEXT_TRUNCATE_LENGTH;
  const displayText = expanded ? fullText : fullText.slice(0, TEXT_TRUNCATE_LENGTH);

  return (
    <div className="p-5 rounded-xl glass border border-border/50 transition-all hover:border-border/80">
      {/* Header: Badge + Meta */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className={`text-xs ${getContributionColor(contribution.type)}`}>
              <Icon className="w-3 h-3 mr-1" />
              {getContributionLabel(contribution.type)}
            </Badge>
            {contribution.isOwnerContribution && (
              <Badge variant="info" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                Propriétaire
              </Badge>
            )}
            {contribution.authorVerified && (
              <Badge variant="verified" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Vérifié
              </Badge>
            )}
          </div>

          {/* Author + Date */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{contribution.author}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {contribution.interventionDate || contribution.date}
            </span>
            {contribution.mileageAtIntervention && contribution.type !== "ownership_change" && (
              <>
                <span>•</span>
                <span>{contribution.mileageAtIntervention.toLocaleString()} km</span>
              </>
            )}
            {contribution.province && contribution.type !== "ownership_change" && (
              <>
                <span>•</span>
                <span>{contribution.province}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      {contribution.title && (
        <h3 className="text-base font-semibold text-foreground mt-3">
          {contribution.title}
        </h3>
      )}

      {/* Text Content - type specific rendering */}
      {renderTextContent(contribution, displayText, summaryText, expanded)}

      {/* Read more toggle */}
      {isLongText && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Réduire</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Lire plus</>
          )}
        </button>
      )}

      {/* Photos */}
      {contribution.hasPhotos && contribution.photos.length > 0 && (
        <div className="mt-4">
          <PhotoGallery photos={contribution.photos} />
        </div>
      )}

      {/* Documents */}
      {contribution.hasDocuments && contribution.documents.length > 0 && (
        <DocumentsList documents={contribution.documents} />
      )}

      {/* Admin actions */}
      {adminActions}
    </div>
  );
}


function DocumentsList({ documents }: { documents: ContributionDocument[] }) {
  const handleOpenDocument = useCallback(async (doc: ContributionDocument) => {
    if (!doc.filePath) return;

    // For vin-documents bucket, create a signed URL
    const { data, error } = await supabase.storage
      .from("vin-documents")
      .createSignedUrl(doc.filePath, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      // Fallback: try as public URL
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
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Documents joints
      </p>
      {documents.map(doc => {
        const hasUrl = !!doc.filePath;
        return (
          <button
            key={doc.id}
            onClick={() => hasUrl && handleOpenDocument(doc)}
            disabled={!hasUrl}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
              hasUrl
                ? "bg-muted/30 border-border/30 hover:bg-muted/60 hover:border-primary/40 cursor-pointer group"
                : "bg-muted/10 border-border/20 opacity-50 cursor-not-allowed"
            }`}
          >
            <File className={`w-5 h-5 flex-shrink-0 ${hasUrl ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
              {doc.description && (
                <p className="text-xs text-muted-foreground">{doc.description}</p>
              )}
              {doc.fileSize && (
                <p className="text-xs text-muted-foreground">
                  {(doc.fileSize / 1024).toFixed(0)} Ko
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-[10px] flex-shrink-0">
              {doc.fileType?.split("/").pop()?.toUpperCase() || "DOC"}
            </Badge>
            {hasUrl && (
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            )}
          </button>
        );
      })}
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

  // For observation, owner_exchange, mechanic_conversation: show text directly
  if (
    type === "observation" ||
    type === "owner_exchange" ||
    type === "mechanic_conversation"
  ) {
    if (!displayText && !summaryText) return null;
    return (
      <div className="mt-3">
        {summaryText && summaryText !== displayText && (
          <p className="text-sm text-foreground/90 mb-2 whitespace-pre-line">{summaryText}</p>
        )}
        {displayText && (
          <blockquote className="text-sm text-foreground/80 border-l-2 border-primary/30 pl-3 italic leading-relaxed whitespace-pre-line">
            {displayText}
          </blockquote>
        )}
      </div>
    );
  }

  // For purchase_decision: highlight decision
  if (type === "purchase_decision") {
    return (
      <div className="mt-3">
        {summaryText && (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {expanded ? (contribution.details || summaryText) : summaryText.slice(0, TEXT_TRUNCATE_LENGTH)}
          </p>
        )}
      </div>
    );
  }

  // For ownership_change: show structured ownership change info
  if (type === "ownership_change") {
    const holderLabel = contribution.holderType === "concessionnaire" && contribution.dealerName
      ? contribution.dealerName
      : contribution.holderType === "concessionnaire" ? "Concessionnaire"
      : contribution.holderType === "depot_vente" ? "Dépôt-vente"
      : contribution.holderType === "particulier" ? "Particulier"
      : null;

    // Format intervention date as month/year
    let dateDisplay: string | null = null;
    if (contribution.interventionDate) {
      const d = new Date(contribution.interventionDate + "T00:00:00");
      const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
      dateDisplay = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }

    return (
      <div className="mt-3 space-y-1.5">
        {summaryText && (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            🔄 {summaryText}
          </p>
        )}
        {dateDisplay && (
          <p className="text-xs text-muted-foreground">{dateDisplay}</p>
        )}
        {holderLabel && (
          <p className="text-xs text-muted-foreground">
            Vendu par : <span className="text-foreground/80">{holderLabel}</span>
          </p>
        )}
        {contribution.province && (
          <p className="text-xs text-muted-foreground">
            Province : <span className="text-foreground/80">{contribution.province}</span>
          </p>
        )}
        {contribution.mileageAtIntervention && (
          <p className="text-xs text-muted-foreground">
            Kilométrage observé : <span className="text-foreground/80">{contribution.mileageAtIntervention.toLocaleString()} km</span>
          </p>
        )}
        {contribution.details && (
          <p className="text-xs text-muted-foreground italic whitespace-pre-line mt-1">
            {contribution.details}
          </p>
        )}
      </div>
    );
  }

  // For for_sale: show structured listing info
  if (type === "for_sale") {
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
      <div className="mt-3 space-y-1.5">
        {summaryText && (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            🏷️ {summaryText}
          </p>
        )}
        {dateDisplay && (
          <p className="text-xs text-muted-foreground">{dateDisplay}</p>
        )}
        {holderLabel && (
          <p className="text-xs text-muted-foreground">
            Vendeur : <span className="text-foreground/80">{holderLabel}</span>
          </p>
        )}
        {contribution.province && (
          <p className="text-xs text-muted-foreground">
            Province : <span className="text-foreground/80">{contribution.province}</span>
          </p>
        )}
        {contribution.askingPrice && (
          <p className="text-xs text-muted-foreground">
            Prix demandé : <span className="text-foreground/80 font-medium">{contribution.askingPrice.toLocaleString()} $</span>
          </p>
        )}
        {contribution.listingUrl && (
          <p className="text-xs">
            <a href={contribution.listingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline">
              Voir l'annonce ↗
            </a>
          </p>
        )}
        {contribution.details && (
          <p className="text-xs text-muted-foreground italic whitespace-pre-line mt-1">
            {contribution.details}
          </p>
        )}
      </div>
    );
  }

  // For inspection_report, vehicle_history: show summary, then details
  if (type === "inspection_report" || type === "vehicle_history") {
    return (
      <div className="mt-3 space-y-2">
        {summaryText && (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{summaryText}</p>
        )}
        {contribution.details && contribution.details !== summaryText && expanded && (
          <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-line">
            {contribution.details}
          </p>
        )}
      </div>
    );
  }

  // For photo_evidence: minimal text, photos are the main content
  if (type === "photo_evidence") {
    if (!summaryText) return null;
    return (
      <p className="text-sm text-foreground/90 mt-3">{summaryText}</p>
    );
  }

  // Fallback
  if (summaryText) {
    return <p className="text-sm text-foreground/90 mt-3 whitespace-pre-line">{summaryText}</p>;
  }

  return null;
}

export { getContributionIcon, getContributionLabel, getContributionColor };
