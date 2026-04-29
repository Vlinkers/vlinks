import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Paperclip,
  Gauge,
  FileX,
  Droplets,
  Car,
  Lock,
  AlertOctagon,
  Recycle,
  GitBranch,
  Search,
  UserCheck,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EVIDENCE_MEDIA_TYPE } from "@/lib/mediaClassification";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Contributor = Tables<"contributors">;
type RedFlagType = Enums<"red_flag_type">;

interface AlertContributionFormProps {
  vinId: string;
  contributor: Contributor | null;
  onComplete: () => void;
  onBack: () => void;
}

interface UploadedFile {
  id: string;
  file: File;
  storagePath: string;
  preview?: string;
  progress: number;
  evidenceType: string;
  description: string;
}

const FLAG_OPTIONS: {
  type: RedFlagType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { type: "odometer_rollback", label: "Recul d'odomètre", icon: <Gauge className="w-5 h-5" /> },
  { type: "title_wash", label: "Lavage de titre", icon: <FileX className="w-5 h-5" /> },
  { type: "flood_damage", label: "Dommage d'inondation", icon: <Droplets className="w-5 h-5" /> },
  { type: "frame_damage", label: "Dommage structural", icon: <Car className="w-5 h-5" /> },
  { type: "stolen", label: "Véhicule volé", icon: <Lock className="w-5 h-5" /> },
  { type: "lemon", label: "Véhicule citron", icon: <AlertOctagon className="w-5 h-5" /> },
  { type: "salvage_rebuilt", label: "Reconstruit après perte totale", icon: <Recycle className="w-5 h-5" /> },
  { type: "inconsistent_history", label: "Historique incohérent", icon: <GitBranch className="w-5 h-5" /> },
  { type: "suspicious_listing", label: "Annonce suspecte", icon: <Search className="w-5 h-5" /> },
  { type: "other", label: "Autre", icon: <AlertTriangle className="w-5 h-5" /> },
];

const SEVERITY_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "low", label: "Faible", color: "bg-muted-foreground" },
  { value: "medium", label: "Moyen", color: "bg-yellow-500" },
  { value: "high", label: "Élevé", color: "bg-orange-500" },
  { value: "critical", label: "Critique", color: "bg-destructive" },
];

const FLAG_EVENT_MAP: Partial<Record<RedFlagType, Enums<"event_type">>> = {
  odometer_rollback: "mileage_record",
  frame_damage: "accident",
  flood_damage: "accident",
  stolen: "other",
  salvage_rebuilt: "other",
  title_wash: "registration",
  lemon: "other",
  inconsistent_history: "other",
  suspicious_listing: "listing",
  other: "other",
};

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime";

const EVIDENCE_TYPES = [
  { value: "photo", label: "Photo" },
  { value: "listing_screenshot", label: "Capture d'annonce" },
  { value: "document", label: "Document" },
  { value: "other", label: "Autre" },
];

function fileIcon(type: string) {
  if (type.startsWith("image")) return <ImageIcon className="w-5 h-5" />;
  if (type.startsWith("video")) return <Video className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

export function AlertContributionForm({
  vinId,
  contributor,
  onComplete,
  onBack,
}: AlertContributionFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);

  // Alert data
  const [flagType, setFlagType] = useState<RedFlagType | null>(null);
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Optional file
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      const id = crypto.randomUUID();
      const ext = file.name.split(".").pop() ?? "bin";
      const bucket = file.type.startsWith("image") ? "vin-photos" : "vin-documents";
      const storagePath = `${vinId}/${id}.${ext}`;

      const entry: UploadedFile = {
        id,
        file,
        storagePath,
        preview: file.type.startsWith("image") ? URL.createObjectURL(file) : undefined,
        progress: 30,
        evidenceType: file.type.startsWith("image") ? "photo" : "other",
        description: "",
      };
      setUploadedFile(entry);

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, { upsert: false });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        entry.progress = -1;
      } else {
        entry.progress = 100;
      }
      setUploadedFile({ ...entry });
      setUploading(false);
    },
    [vinId]
  );

  const canProceed =
    flagType !== null && severity !== "" && description.trim().length >= 30;

  const flagLabel = FLAG_OPTIONS.find((f) => f.type === flagType)?.label ?? "";
  const severityOption = SEVERITY_OPTIONS.find((s) => s.value === severity);
  const successFile = uploadedFile?.progress === 100 ? uploadedFile : null;

  const handleSubmit = async () => {
    if (!flagType || !severity) return;
    setSubmitting(true);
    setError(null);

    try {
      const eventType = FLAG_EVENT_MAP[flagType] ?? "other";

      // 1. Create event
      const { data: evt, error: evtErr } = await supabase
        .from("events")
        .insert({
          vin_id: vinId,
          event_type: eventType,
          title: `Signalement : ${flagLabel}`,
        })
        .select("id")
        .single();
      if (evtErr) throw evtErr;

      // 2. Create fact
      const factPayload: any = {
        event_id: evt.id,
        content: description.trim(),
        face: "face_a" as const,
        is_anonymous: isAnonymous,
      };

      // Use contributor if available, otherwise create a placeholder contributor_id
      if (contributor) {
        factPayload.contributor_id = contributor.id;
      } else if (user) {
        // Authenticated but no contributor — create one
        const { data: newC, error: cErr } = await supabase
          .from("contributors")
          .insert({
            user_id: user.id,
            vin_id: vinId,
            role: "anonymous",
            face: "face_a",
            is_anonymous: true,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        factPayload.contributor_id = newC.id;
      } else {
        // Fully anonymous — create anonymous contributor with no user_id
        const { data: newC, error: cErr } = await supabase
          .from("contributors")
          .insert({
            vin_id: vinId,
            role: "anonymous",
            face: "face_a",
            is_anonymous: true,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        factPayload.contributor_id = newC.id;
      }

      const { data: fact, error: factErr } = await supabase
        .from("facts")
        .insert(factPayload)
        .select("id")
        .single();
      if (factErr) throw factErr;

      // 3. Upload evidence if present
      if (successFile) {
        const bucket = successFile.file.type.startsWith("image") ? "vin-photos" : "vin-documents";
        await supabase.from("evidence").insert({
          fact_id: fact.id,
          evidence_type: successFile.evidenceType,
          media_type: EVIDENCE_MEDIA_TYPE.diagnostic,
          file_type: successFile.file.type,
          file_name: successFile.file.name,
          file_path: `${bucket}/${successFile.storagePath}`,
          file_size: successFile.file.size,
          description: successFile.description || null,
        } as never);
      }

      // 4. Create red_flag
      const { error: rfErr } = await supabase.from("red_flags").insert({
        vin_id: vinId,
        flag_type: flagType,
        severity,
        title: flagLabel,
        description: description.trim(),
        supporting_facts: [fact.id],
        is_active: true,
      });
      if (rfErr) throw rfErr;

      setSubmitted(true);
      setTimeout(onComplete, 2500);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 text-center space-y-4 border-border bg-card">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="font-display text-lg font-semibold">Signalement enregistré</h3>
        <p className="text-sm text-muted-foreground">
          Il sera examiné par notre équipe. Merci pour votre vigilance.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-5 border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={step === 1 ? onBack : () => setStep(1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {step === 1 ? "Retour" : "Précédent"}
        </Button>
        <div className="flex items-center gap-1.5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? "w-8 bg-primary" : s < step ? "w-6 bg-primary/40" : "w-6 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h3 className="font-display text-lg font-semibold">Signaler un problème</h3>
            <p className="text-sm text-muted-foreground">
              Aidez la communauté en signalant une anomalie sur ce véhicule.
            </p>
          </div>

          {/* Flag type grid */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quel type de problème signalez-vous ?</p>
            <div className="grid grid-cols-2 gap-2">
              {FLAG_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setFlagType(opt.type)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all text-sm ${
                    flagType === opt.type
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border hover:border-destructive/40 hover:bg-muted/20 text-foreground"
                  }`}
                >
                  <span className={flagType === opt.type ? "text-destructive" : "text-muted-foreground"}>
                    {opt.icon}
                  </span>
                  <span className="font-medium leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Sévérité estimée</p>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all flex-1 justify-center ${
                    severity === opt.value
                      ? "border-foreground bg-foreground/5 font-semibold"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Décrivez le problème</label>
            <Textarea
              placeholder="Expliquez pourquoi vous pensez qu'il y a un problème avec ce véhicule..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {description.length > 0 && description.length < 30 && (
              <p className="text-xs text-destructive">Minimum 30 caractères ({description.length}/30)</p>
            )}
          </div>

          {/* Optional upload */}
          <Collapsible open={attachOpen} onOpenChange={setAttachOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <Paperclip className="w-4 h-4" />
                <span>Ajouter des fichiers (optionnel)</span>
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${attachOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Une preuve renforcera votre signalement.
              </p>

              {!uploadedFile && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm">Cliquez pour sélectionner un fichier</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                </div>
              )}

              {uploadedFile && (
                <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
                  <div className="flex items-center gap-2">
                    {uploadedFile.preview ? (
                      <img src={uploadedFile.preview} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        {fileIcon(uploadedFile.file.type)}
                      </div>
                    )}
                    <span className="text-sm font-medium truncate flex-1">{uploadedFile.file.name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setUploadedFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {uploadedFile.progress >= 0 && uploadedFile.progress < 100 && (
                    <Progress value={uploadedFile.progress} className="h-1" />
                  )}
                  {uploadedFile.progress === 100 && (
                    <Select
                      value={uploadedFile.evidenceType}
                      onValueChange={(v) => setUploadedFile({ ...uploadedFile, evidenceType: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVIDENCE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {uploadedFile.progress === -1 && (
                    <p className="text-xs text-destructive">Erreur de téléversement</p>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Anonymity */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Déposer anonymement</span>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>
          {isAnonymous && (
            <p className="text-xs text-muted-foreground -mt-2 pl-1">
              Votre identité ne sera pas visible mais sera conservée par VLINKS.
            </p>
          )}

          <Button
            className="w-full"
            disabled={!canProceed || uploading}
            onClick={() => setStep(2)}
          >
            Vérifier le signalement
          </Button>
        </div>
      )}

      {/* STEP 2 - Review */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold">Vérifiez votre signalement</h3>

          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="font-semibold">{flagLabel}</span>
              </div>
              {severityOption && (
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${severityOption.color}`} />
                  <span>Sévérité : {severityOption.label}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <p className="font-medium mb-1">Description :</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{description}</p>
            </div>

            {successFile && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center gap-2">
                {fileIcon(successFile.file.type)}
                <span className="truncate flex-1">{successFile.file.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {EVIDENCE_TYPES.find((t) => t.value === successFile.evidenceType)?.label}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border text-muted-foreground">
              {isAnonymous ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Signalement anonyme</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Signalement identifié</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-sm text-orange-700 dark:text-orange-400">
            ⚠ Les signalements abusifs pourront entraîner la suspension de votre compte.
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive p-3 rounded-lg bg-destructive/10">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button className="w-full" variant="destructive" disabled={submitting} onClick={handleSubmit}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
            Envoyer le signalement
          </Button>
        </div>
      )}
    </Card>
  );
}
