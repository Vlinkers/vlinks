import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVinDossier } from "@/hooks/useVinDossier";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Contributor = Tables<"contributors">;
type EventType = Enums<"event_type">;

interface DocumentContributionFormProps {
  vinId: string;
  contributor: Contributor;
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
  isRedacted: boolean;
}

const EVIDENCE_TYPES = [
  { value: "photo", label: "Photo du véhicule" },
  { value: "invoice", label: "Facture" },
  { value: "inspection_report", label: "Rapport d'inspection" },
  { value: "insurance_doc", label: "Document d'assurance" },
  { value: "registration", label: "Certificat d'immatriculation" },
  { value: "listing_screenshot", label: "Capture d'annonce" },
  { value: "video", label: "Vidéo" },
  { value: "other", label: "Autre document" },
];

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "purchase", label: "Achat" },
  { value: "sale", label: "Vente" },
  { value: "accident", label: "Accident" },
  { value: "repair", label: "Réparation" },
  { value: "maintenance", label: "Entretien" },
  { value: "inspection", label: "Inspection" },
  { value: "modification", label: "Modification" },
  { value: "recall", label: "Rappel" },
  { value: "insurance_claim", label: "Réclamation d'assurance" },
  { value: "listing", label: "Mise en vente" },
  { value: "import_export", label: "Import / Export" },
  { value: "registration", label: "Immatriculation" },
  { value: "mileage_record", label: "Relevé kilométrique" },
  { value: "other", label: "Autre" },
];

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime";

const TIER3_TYPES = ["invoice", "inspection_report", "insurance_doc", "registration"];
const TIER2_TYPES = ["photo", "document", "listing_screenshot", "video", "other"];

function predictTier(files: UploadedFile[]): Enums<"proof_tier"> {
  if (files.some((f) => TIER3_TYPES.includes(f.evidenceType))) return "verified";
  if (files.some((f) => TIER2_TYPES.includes(f.evidenceType))) return "documented";
  return "declaration";
}

function fileIcon(type: string) {
  if (type.startsWith("image")) return <ImageIcon className="w-5 h-5" />;
  if (type.startsWith("video")) return <Video className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

export function DocumentContributionForm({
  vinId,
  contributor,
  onComplete,
  onBack,
}: DocumentContributionFormProps) {
  const { data: dossier } = useVinDossier(vinId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Step 2
  const [eventChoice, setEventChoice] = useState<"existing" | "new">("existing");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [newEventType, setNewEventType] = useState<EventType | "">("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventDateApprox, setNewEventDateApprox] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventMileage, setNewEventMileage] = useState("");
  const [factContent, setFactContent] = useState("");

  // Step 3
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingEvents = dossier?.events.map((e) => e.event) ?? [];

  // ── Upload logic ──
  const handleFiles = useCallback(
    async (fileList: FileList) => {
      setUploading(true);
      const newFiles: UploadedFile[] = [];

      for (const file of Array.from(fileList)) {
        const id = crypto.randomUUID();
        const ext = file.name.split(".").pop() ?? "bin";
        const bucket = file.type.startsWith("image") ? "vin-photos" : "vin-documents";
        const storagePath = `${vinId}/${id}.${ext}`;

        const entry: UploadedFile = {
          id,
          file,
          storagePath,
          preview: file.type.startsWith("image") ? URL.createObjectURL(file) : undefined,
          progress: 0,
          evidenceType: file.type.startsWith("image")
            ? "photo"
            : file.type === "application/pdf"
              ? "other"
              : file.type.startsWith("video")
                ? "video"
                : "other",
          description: "",
          isRedacted: false,
        };
        newFiles.push(entry);

        // Upload
        entry.progress = 30;
        setFiles((prev) => [...prev, { ...entry }]);

        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(storagePath, file, { upsert: false });

        if (uploadErr) {
          console.error("Upload error:", uploadErr);
          entry.progress = -1;
        } else {
          entry.progress = 100;
        }
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...entry } : f)));
      }
      setUploading(false);
    },
    [vinId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFile = (id: string, patch: Partial<UploadedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  // ── Validation ──
  const successfulFiles = files.filter((f) => f.progress === 100);
  const canProceedStep1 = successfulFiles.length > 0;
  const canProceedStep2 =
    factContent.trim().length >= 20 &&
    (eventChoice === "existing"
      ? selectedEventId !== ""
      : newEventType !== "" && newEventTitle.trim().length > 0);

  // ── Submit ──
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let eventId = selectedEventId;

      // Create event if new
      if (eventChoice === "new") {
        const { data: evt, error: evtErr } = await supabase
          .from("events")
          .insert({
            vin_id: vinId,
            event_type: newEventType as EventType,
            title: newEventTitle.trim(),
            event_date: newEventDate || null,
            event_date_precision: newEventDateApprox ? "approximate" : "exact",
            mileage_at_event: newEventMileage ? parseInt(newEventMileage) : null,
          })
          .select("id")
          .single();
        if (evtErr) throw evtErr;
        eventId = evt.id;
      }

      // Create fact
      const { data: fact, error: factErr } = await supabase
        .from("facts")
        .insert({
          event_id: eventId,
          contributor_id: contributor.id,
          face: contributor.face,
          content: factContent.trim(),
          is_anonymous: contributor.is_anonymous ?? false,
        })
        .select("id")
        .single();
      if (factErr) throw factErr;

      // Create evidence records
      for (const f of successfulFiles) {
        const bucket = f.file.type.startsWith("image") ? "vin-photos" : "vin-documents";
        const { error: evErr } = await supabase.from("evidence").insert({
          fact_id: fact.id,
          evidence_type: f.evidenceType,
          file_type: f.file.type,
          file_name: f.file.name,
          file_path: `${bucket}/${f.storagePath}`,
          file_size: f.file.size,
          description: f.description || null,
          is_redacted: f.isRedacted,
        });
        if (evErr) console.error("Evidence insert error:", evErr);
      }

      setSubmitted(true);
      setTimeout(onComplete, 2000);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──
  if (submitted) {
    return (
      <Card className="p-6 text-center space-y-4 border-border bg-card">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="font-display text-lg font-semibold">Document déposé avec succès</h3>
        <p className="text-sm text-muted-foreground">
          Votre contribution sera examinée par notre équipe avant publication.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-5 border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={step === 1 ? onBack : () => setStep(step - 1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {step === 1 ? "Retour" : "Précédent"}
        </Button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs">
        {[
          { n: 1, label: "Fichiers" },
          { n: 2, label: "Détails" },
          { n: 3, label: "Confirmation" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                s.n === step
                  ? "bg-primary text-primary-foreground font-medium"
                  : s.n < step
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="font-mono">{s.n}.</span>
              <span>{s.label}</span>
            </div>
            {i < 2 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* STEP 1 - Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Téléversez vos documents</h3>
            <p className="text-sm text-muted-foreground">
              Photos, factures, rapports, vidéos — tout ce qui documente ce véhicule.
            </p>
            <p className="text-xs text-muted-foreground mt-1 italic">
              Vous pourrez ajouter une description et des détails à l'étape suivante.
            </p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Glissez-déposez ou cliquez pour sélectionner</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WebP, PDF, MP4, MOV
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border"
                >
                  {f.preview ? (
                    <img
                      src={f.preview}
                      alt=""
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      {fileIcon(f.file.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.file.name}</p>
                    {f.progress >= 0 && f.progress < 100 && (
                      <Progress value={f.progress} className="h-1 mt-1" />
                    )}
                    {f.progress === 100 && (
                      <p className="text-xs text-emerald-600">Téléversé</p>
                    )}
                    {f.progress === -1 && (
                      <p className="text-xs text-destructive">Erreur</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(f.id);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            disabled={!canProceedStep1 || uploading}
            onClick={() => setStep(2)}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            Continuer
          </Button>
        </div>
      )}

      {/* STEP 2 - Classify & Describe */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h3 className="font-display text-lg font-semibold">Classez vos documents</h3>
            <p className="text-sm text-muted-foreground">
              Identifiez chaque fichier et décrivez le contexte.
            </p>
          </div>

          {/* Per-file classification */}
          <div className="space-y-3">
            {successfulFiles.map((f) => (
              <div key={f.id} className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
                <div className="flex items-center gap-2">
                  {f.preview ? (
                    <img src={f.preview} alt="" className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      {fileIcon(f.file.type)}
                    </div>
                  )}
                  <span className="text-sm font-medium truncate flex-1">{f.file.name}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground block">
                    Type de fichier <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={f.evidenceType}
                    onValueChange={(v) => updateFile(f.id, { evidenceType: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sélectionnez le type de fichier" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVIDENCE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={f.isRedacted}
                    onCheckedChange={(v) => updateFile(f.id, { isRedacted: !!v })}
                  />
                  Information sensible masquée
                </label>
              </div>
            ))}
          </div>

          {/* Event context */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Ce document concerne :</p>

            <div className="flex gap-2">
              <Button
                variant={eventChoice === "existing" ? "default" : "outline"}
                size="sm"
                onClick={() => setEventChoice("existing")}
              >
                Un événement déjà documenté
              </Button>
              <Button
                variant={eventChoice === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setEventChoice("new")}
              >
                Un nouvel événement
              </Button>
            </div>

            {eventChoice === "existing" && existingEvents.length > 0 && (
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un événement existant" />
                </SelectTrigger>
                <SelectContent>
                  {existingEvents.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                      {e.event_date ? ` — ${e.event_date}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {eventChoice === "existing" && existingEvents.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Aucun événement existant. Créez-en un nouveau.
              </p>
            )}

            {eventChoice === "new" && (
              <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                <Select
                  value={newEventType}
                  onValueChange={(v) => setNewEventType(v as EventType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type d'événement" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Titre de l'événement"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                />
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="flex-1"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={newEventDateApprox}
                      onCheckedChange={(v) => setNewEventDateApprox(!!v)}
                    />
                    Approximative
                  </label>
                </div>
                <Input
                  type="number"
                  placeholder="Kilométrage (optionnel)"
                  value={newEventMileage}
                  onChange={(e) => setNewEventMileage(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Fact content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Décrivez brièvement ce que ce document montre
            </label>
            <Textarea
              placeholder="Ex: Facture d'entretien chez le concessionnaire, remplacement des freins avant à 142 000 km..."
              value={factContent}
              onChange={(e) => setFactContent(e.target.value)}
              rows={3}
            />
            {factContent.length > 0 && factContent.length < 20 && (
              <p className="text-xs text-destructive">Minimum 20 caractères</p>
            )}
          </div>

          <Button className="w-full" disabled={!canProceedStep2} onClick={() => setStep(3)}>
            <ArrowRight className="w-4 h-4 mr-2" />
            Vérifier et déposer
          </Button>
        </div>
      )}

      {/* STEP 3 - Review & Submit */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Vérifiez votre dépôt</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
              <p className="font-medium">
                Événement :{" "}
                {eventChoice === "new"
                  ? newEventTitle
                  : existingEvents.find((e) => e.id === selectedEventId)?.title ?? "—"}
              </p>
              {eventChoice === "new" && newEventDate && (
                <p className="text-muted-foreground">
                  Date : {newEventDate}
                  {newEventDateApprox ? " (approximative)" : ""}
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <p className="font-medium mb-1">Fait déposé :</p>
              <p className="text-muted-foreground">{factContent}</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1.5">
              <p className="font-medium">
                {successfulFiles.length} pièce{successfulFiles.length > 1 ? "s" : ""} jointe
                {successfulFiles.length > 1 ? "s" : ""}
              </p>
              {successfulFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-muted-foreground">
                  {fileIcon(f.file.type)}
                  <span className="truncate">{f.file.name}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {EVIDENCE_TYPES.find((t) => t.value === f.evidenceType)?.label ?? f.evidenceType}
                  </Badge>
                </div>
              ))}
            </div>

          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive p-3 rounded-lg bg-destructive/10">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Déposer
          </Button>
        </div>
      )}
    </Card>
  );
}
