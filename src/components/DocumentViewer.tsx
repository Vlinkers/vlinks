import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Download, FileText, Image, File, Loader2, Lock, ZoomIn, ZoomOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { ContributionDocument } from "@/hooks/useVINData";

interface DocumentViewerProps {
  doc: ContributionDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
const PDF_TYPES = ["application/pdf"];

export function DocumentViewer({ doc, open, onOpenChange }: DocumentViewerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [zoom, setZoom] = useState(1);

  // Check premium status
  useEffect(() => {
    const checkPremium = async () => {
      setCheckingPremium(true);
      if (!user) { setIsPremium(false); setCheckingPremium(false); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsPremium(!!(profile as any)?.is_premium);
      setCheckingPremium(false);
    };
    if (open) checkPremium();
  }, [user, open]);

  // Generate URL on open
  useEffect(() => {
    if (!open || !doc?.filePath) { setViewUrl(null); return; }
    setLoading(true);
    setZoom(1);

    // If filePath is already a full URL, use it directly
    if (doc.filePath.startsWith("http")) {
      setViewUrl(doc.filePath);
      setLoading(false);
      return;
    }

    const { data } = supabase.storage.from("vin-documents").getPublicUrl(doc.filePath);
    setViewUrl(data?.publicUrl || null);
    setLoading(false);
  }, [open, doc?.filePath]);

  // Cleanup URL on close
  useEffect(() => {
    if (!open) setViewUrl(null);
  }, [open]);

  const fileType = doc?.fileType?.toLowerCase() || "";
  const isImage = IMAGE_TYPES.some(t => fileType.includes(t));
  const isPdf = PDF_TYPES.some(t => fileType.includes(t));
  const extension = doc?.fileType?.split("/").pop()?.toUpperCase() || doc?.fileName?.split(".").pop()?.toUpperCase() || "DOC";

  const handleDownload = async () => {
    if (!doc?.filePath || !viewUrl) return;
    try {
      const response = await fetch(viewUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erreur de téléchargement", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {isImage ? <Image className="w-4 h-4 text-primary" /> :
               isPdf ? <FileText className="w-4 h-4 text-primary" /> :
               <File className="w-4 h-4 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{doc?.fileName || "Document"}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] font-mono">{extension}</Badge>
                {doc?.fileSize && <span>{(doc.fileSize / 1024).toFixed(0)} Ko</span>}
                {doc?.description && <span className="truncate">{doc.description}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Viewer body */}
        <div className="flex-1 overflow-auto bg-muted/10 min-h-[300px] relative">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !viewUrl ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <p className="text-sm text-muted-foreground">Impossible de charger le document.</p>
            </div>
          ) : isPdf ? (
            <iframe
              src={`${viewUrl}#toolbar=0`}
              className="w-full h-full min-h-[60vh]"
              title={doc?.fileName || "PDF"}
              style={{ border: "none" }}
            />
          ) : isImage ? (
            <div className="flex flex-col items-center justify-center p-4 h-full">
              {/* Zoom controls for images */}
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                  disabled={zoom <= 0.25}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              <div className="overflow-auto max-h-[60vh] max-w-full">
                <img
                  src={viewUrl}
                  alt={doc?.fileName || "Image"}
                  className="transition-transform duration-200"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                <File className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{doc?.fileName}</p>
              <p className="text-xs text-muted-foreground">Aperçu non disponible pour ce format</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>

          <div className="flex items-center gap-2">
            {checkingPremium ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isPremium ? (
              <Button size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1.5" />
                Télécharger
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" disabled className="opacity-60">
                  <Lock className="w-4 h-4 mr-1.5" />
                  Télécharger
                </Button>
                <span className="text-xs text-muted-foreground max-w-[200px]">
                  {user
                    ? "Fonctionnalité Premium — Passez à Premium pour télécharger les documents"
                    : <button onClick={() => { onOpenChange(false); navigate("/auth"); }} className="text-primary hover:underline">Connectez-vous pour accéder au téléchargement</button>
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
