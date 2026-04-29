import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquareReply, Upload, X, FileText, Image, Shield, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { sanitizeFileName } from "@/lib/sanitizeFileName";
import { classifyUploadMediaType } from "@/lib/mediaClassification";

type Fact = Tables<"facts">;
type Contributor = Tables<"contributors">;

interface OwnerResponseFormProps {
  vinId: string;
  eventId: string;
  factToRespondTo: Fact;
  ownerContributor: Contributor;
  onComplete: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner_verified: "Propriétaire vérifié",
  owner_unverified: "Propriétaire",
  buyer: "Acheteur",
  mechanic: "Mécanicien",
  inspector: "Inspecteur",
  dealer: "Concessionnaire",
  witness: "Témoin",
  former_owner: "Ancien propriétaire",
  anonymous: "Anonyme",
};

const TIER_CONFIG: Record<string, { label: string; dots: string }> = {
  declaration: { label: "Déclaration", dots: "●○○" },
  documented: { label: "Documenté", dots: "●●○" },
  verified: { label: "Vérifié", dots: "●●●" },
};

const EVIDENCE_TYPES = [
  { value: "invoice", label: "Facture" },
  { value: "photo", label: "Photo" },
  { value: "document", label: "Document" },
  { value: "inspection_report", label: "Rapport d'inspection" },
  { value: "registration", label: "Immatriculation" },
  { value: "other", label: "Autre" },
];

interface UploadedFile {
  file: File;
  preview: string;
  evidenceType: string;
}

export default function OwnerResponseForm({
  vinId,
  eventId,
  factToRespondTo,
  ownerContributor,
  onComplete,
}: OwnerResponseFormProps) {
  const [content, setContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const isOwnerVerified = ownerContributor.role === "owner_verified";
  const tierInfo = TIER_CONFIG[factToRespondTo.proof_tier ?? "declaration"] ?? TIER_CONFIG.declaration;
  const canSubmit = content.trim().length >= 20 && !submitting;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    setUploadedFile({
      file,
      preview: isImage ? URL.createObjectURL(file) : "",
      evidenceType: isImage ? "photo" : "document",
    });
  };

  const removeFile = () => {
    if (uploadedFile?.preview) URL.revokeObjectURL(uploadedFile.preview);
    setUploadedFile(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      // 1. Create face_b fact
      const { data: fact, error: factErr } = await supabase
        .from("facts")
        .insert({
          event_id: eventId,
          contributor_id: ownerContributor.id,
          content: content.trim(),
          face: "face_b" as Enums<"contribution_face">,
          moderation_status: "pending" as Enums<"moderation_status">,
          is_anonymous: false,
        })
        .select("id")
        .single();

      if (factErr || !fact) throw factErr ?? new Error("Échec création fait");

      // 2. Upload evidence if present
      if (uploadedFile) {
        const safeName = sanitizeFileName(uploadedFile.file.name);
        const bucket = uploadedFile.file.type.startsWith("image/") ? "vin-photos" : "vin-documents";
        const path = `${vinId}/${fact.id}/${safeName}`;

        const { error: storageErr } = await supabase.storage
          .from(bucket)
          .upload(path, uploadedFile.file);

        if (storageErr) throw storageErr;

        const { error: evidenceErr } = await supabase.from("evidence").insert({
          fact_id: fact.id,
          evidence_type: uploadedFile.evidenceType,
          media_type: classifyUploadMediaType("owner_response", uploadedFile.evidenceType, uploadedFile.file.type),
          file_name: uploadedFile.file.name,
          file_path: `${bucket}/${path}`,
          file_type: uploadedFile.file.type,
          file_size: uploadedFile.file.size,
        } as never);

        if (evidenceErr) throw evidenceErr;
      }

      setSuccess(true);
      toast.success("Réponse déposée avec succès");
      setTimeout(() => onComplete(), 1500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors du dépôt");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Votre réponse a été ajoutée.</p>
            <p className="text-muted-foreground mt-1">
              Cet événement a maintenant des sources des deux faces.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquareReply className="w-4 h-4" />
        Répondre à ce fait
      </div>

      {/* Original community fact */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <span>👤 {ROLE_LABELS[factToRespondTo.face === "face_a" ? "buyer" : "owner_verified"] ?? "Communauté"}</span>
            <span>·</span>
            <span>{tierInfo.dots} {tierInfo.label}</span>
          </div>
          <p className="text-sm text-foreground italic">
            "{factToRespondTo.content}"
          </p>
        </CardContent>
      </Card>

      {/* Unverified owner warning */}
      {!isOwnerVerified && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning-foreground">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
          <p>
            Vérifiez votre identité pour augmenter la crédibilité de vos réponses.{" "}
            <a href="#verification" className="underline font-medium">
              Lancer la vérification
            </a>
          </p>
        </div>
      )}

      {/* Response textarea */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Votre réponse</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Expliquez votre point de vue sur ce fait..."
          className="min-h-[100px] resize-y"
        />
        {content.length > 0 && content.trim().length < 20 && (
          <p className="text-xs text-destructive">Minimum 20 caractères ({content.trim().length}/20)</p>
        )}
      </div>

      {/* Optional upload */}
      <Collapsible open={uploadOpen} onOpenChange={setUploadOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="w-4 h-4" />
            Ajouter des fichiers (optionnel)
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          {!uploadedFile ? (
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Cliquez pour sélectionner un fichier</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
              {uploadedFile.preview ? (
                <img src={uploadedFile.preview} alt="" className="w-10 h-10 rounded object-cover" />
              ) : (
                <FileText className="w-10 h-10 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{uploadedFile.file.name}</p>
                <select
                  value={uploadedFile.evidenceType}
                  onChange={(e) => setUploadedFile({ ...uploadedFile, evidenceType: e.target.value })}
                  className="mt-1 text-xs border rounded px-2 py-1 bg-background"
                >
                  {EVIDENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <button onClick={removeFile} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
        ) : (
          <><Shield className="w-4 h-4" /> Déposer ma réponse</>
        )}
      </Button>
    </div>
  );
}
