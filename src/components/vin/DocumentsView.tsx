import { useMemo } from "react";
import { FileText, FileSpreadsheet, FileImage, Plus, Download, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VinDossier, Contributor } from "@/hooks/useVinDossier";

interface DocumentsViewProps {
  dossier: VinDossier | null | undefined;
  onNavigate?: (view: string) => void;
}

interface DocItem {
  id: string;
  url: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  evidenceType: string;
  uploadedAt: string;
  contributor: Contributor | null;
  isInspection: boolean;
}

const DOC_TYPES = ["document", "invoice", "inspection_report", "insurance_doc", "registration", "listing_screenshot"];

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

function isDoc(ev: { evidence_type: string; file_type: string | null }) {
  return DOC_TYPES.includes(ev.evidence_type) || ev.file_type === "application/pdf";
}

function docUrl(path: string) {
  if (path.startsWith("http")) return path;
  return supabase.storage.from("vin-documents").getPublicUrl(path).data.publicUrl;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function contributorLabel(c: Contributor | null) {
  if (!c) return "Anonyme";
  if (c.is_anonymous) return "Anonyme";
  return c.display_name || ROLE_LABELS[c.role] || "Contributeur";
}

function fileIcon(type: string | null, isInspection: boolean) {
  if (isInspection) return ClipboardCheck;
  if (type === "application/pdf") return FileText;
  if (type?.startsWith("image/")) return FileImage;
  if (type?.includes("sheet") || type?.includes("excel")) return FileSpreadsheet;
  return FileText;
}

export function DocumentsView({ dossier, onNavigate }: DocumentsViewProps) {
  const documents = useMemo<DocItem[]>(() => {
    if (!dossier) return [];
    const items: DocItem[] = [];
    for (const ewf of dossier.events) {
      for (const fw of ewf.facts) {
        for (const ev of fw.evidence) {
          if (!isDoc(ev)) continue;
          items.push({
            id: ev.id,
            url: docUrl(ev.file_path),
            fileName: ev.file_name,
            fileType: ev.file_type,
            fileSize: ev.file_size,
            evidenceType: ev.evidence_type,
            uploadedAt: ev.created_at ?? "",
            contributor: fw.contributor,
            isInspection: ev.evidence_type === "inspection_report" || ewf.event.event_type === "inspection",
          });
        }
      }
    }
    items.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
    return items;
  }, [dossier]);

  if (documents.length === 0) {
    return (
      <div className="animate-in fade-in duration-200">
        <header className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Documents</h2>
        </header>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Aucun document n'a été déposé.
          </p>
          <Button size="sm" onClick={() => onNavigate?.("contribute")}>
            <Plus className="w-4 h-4 mr-1.5" /> Ajouter un document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-200">
      <header className="mb-5">
        <h2 className="font-display text-2xl font-bold text-foreground">Documents</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {documents.length} document{documents.length > 1 ? "s" : ""} déposé{documents.length > 1 ? "s" : ""}
        </p>
      </header>

      <div className="space-y-2">
        {documents.map((d) => {
          const Icon = fileIcon(d.fileType, d.isInspection);
          return (
            <a
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/40 hover:border-primary/40 transition-colors group"
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center ${
                  d.isInspection
                    ? "bg-[hsl(152,69%,38%)]/10 text-[hsl(152,69%,38%)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{d.fileName}</p>
                  {d.isInspection && (
                    <Badge variant="inspection" className="text-[10px]">Rapport d'inspection</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Déposé par <span className="font-medium">{contributorLabel(d.contributor)}</span>
                  {" · "}{formatDate(d.uploadedAt)}
                  {d.fileSize ? ` · ${formatSize(d.fileSize)}` : ""}
                </p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
