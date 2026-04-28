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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  Paperclip,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVinDossier } from "@/hooks/useVinDossier";
import { getFieldsForEventType, type FieldDef } from "@/lib/eventTypeMetadata";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Contributor = Tables<"contributors">;
type EventType = Enums<"event_type">;

interface TestimonyContributionFormProps {
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

function predictTier(file: UploadedFile | null): Enums<"proof_tier"> {
  if (!file) return "declaration";
  if (TIER3_TYPES.includes(file.evidenceType)) return "verified";
  return "documented";
}

function fileIcon(type: string) {
  if (type.startsWith("image")) return <ImageIcon className="w-5 h-5" />;
  if (type.startsWith("video")) return <Video className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

export function TestimonyContributionForm({
  vinId,
  contributor,
  onComplete,
  onBack,
}: TestimonyContributionFormProps) {
  const { data: dossier } = useVinDossier(vinId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);

  // Testimony
  const [factContent, setFactContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Event context
  const [eventChoice, setEventChoice] = useState<"existing" | "new">("existing");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [newEventType, setNewEventType] = useState<EventType | "">("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventDateApprox, setNewEventDateApprox] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventMileage, setNewEventMileage] = useState("");

  // Per-event-type structured metadata (stored in facts.metadata jsonb)
  const [metadata, setMetadata] = useState<Record<string, string | boolean>>({});
  const setMetaField = (key: string, value: string | boolean) =>
    setMetadata((m) => ({ ...m, [key]: value }));

  // Optional file
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPurchaseEvent = eventChoice === "new" && newEventType === "purchase";
  const isSaleEvent = eventChoice === "new" && newEventType === "sale";
  const isTransactionEvent = isPurchaseEvent || isSaleEvent;

  const existingEvents = dossier?.events.map((e) => e.event) ?? [];

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
        evidenceType: file.type.startsWith("image")
          ? "photo"
          : file.type === "application/pdf"
            ? "other"
            : file.type.startsWith("video")
              ? "video"
              : "other",
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

  const COUNTERPARTY_LABELS: Record<string, string> = {
    particulier: "Particulier",
    concessionnaire: "Concessionnaire",
    encan: "Encan",
    reprise: "Reprise",
    autre: "Autre",
  };

  const canProceed =
    eventChoice === "existing"
      ? selectedEventId !== ""
      : newEventType !== "" && newEventTitle.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let eventId = selectedEventId;

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

      // Build clean metadata for the fact (only fields defined for the chosen event type)
      const eventTypeForFields = eventChoice === "new"
        ? (newEventType as string)
        : (existingEvents.find((e) => e.id === eventId)?.event_type as string | undefined) ?? "";
      const definedKeys = new Set<string>();
      for (const f of getFieldsForEventType(eventTypeForFields)) {
        definedKeys.add(f.key);
        if (f.visibilityKey) definedKeys.add(f.visibilityKey);
      }
      const cleanedMetadata: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(metadata)) {
        if (!definedKeys.has(k)) continue;
        if (v === "" || v === null || v === undefined) continue;
        cleanedMetadata[k] = v;
      }

      const { data: fact, error: factErr } = await supabase
        .from("facts")
        .insert({
          event_id: eventId,
          contributor_id: contributor.id,
          face: contributor.face,
          content: factContent.trim(),
          is_anonymous: isAnonymous,
          metadata: cleanedMetadata as any,
        })
        .select("id")
        .single();
      if (factErr) throw factErr;

      if (uploadedFile && uploadedFile.progress === 100) {
        const bucket = uploadedFile.file.type.startsWith("image") ? "vin-photos" : "vin-documents";
        await supabase.from("evidence").insert({
          fact_id: fact.id,
          evidence_type: uploadedFile.evidenceType,
          file_type: uploadedFile.file.type,
          file_name: uploadedFile.file.name,
          file_path: `${bucket}/${uploadedFile.storagePath}`,
          file_size: uploadedFile.file.size,
          description: uploadedFile.description || null,
        });
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

  const successFile = uploadedFile?.progress === 100 ? uploadedFile : null;
  const tier = predictTier(successFile);

  if (submitted) {
    return (
      <Card className="p-6 text-center space-y-4 border-border bg-card">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="font-display text-lg font-semibold">Contribution déposée avec succès</h3>
        <p className="text-sm text-muted-foreground">Votre contribution sera examinée par notre équipe avant publication.</p>
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
            <h3 className="font-display text-lg font-semibold">Ajouter une contribution</h3>
            <p className="text-sm text-muted-foreground">
              Partagez ce que vous savez sur ce véhicule.
            </p>
          </div>

          {/* Event context */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Cette contribution concerne :</p>
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
                      {e.title}{e.event_date ? ` — ${e.event_date}` : ""}
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
              <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground block">
                    Type d'événement <span className="text-destructive">*</span>
                  </label>
                  <Select value={newEventType} onValueChange={(v) => setNewEventType(v as EventType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le type d'événement" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground block">
                    Titre de votre contribution <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Résumez en une phrase (ex: Changement de courroie à 80 000 km)"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                  />
                </div>

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

                {/* Conditional fields per event type */}
                {newEventType !== "" && getFieldsForEventType(newEventType).length > 0 && (
                  <div className="space-y-3 mt-2 p-3 rounded-md border border-border/60 bg-muted/30">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Détails complémentaires
                    </p>
                    {getFieldsForEventType(newEventType).map((f) => (
                      <ConditionalFieldRow
                        key={f.key}
                        field={f}
                        value={metadata[f.key]}
                        visibility={f.visibilityKey ? !!metadata[f.visibilityKey] : false}
                        onChange={(v) => setMetaField(f.key, v)}
                        onVisibilityChange={(v) => f.visibilityKey && setMetaField(f.visibilityKey, v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description (last) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">
              Description (optionnel)
            </label>
            <Textarea
              placeholder="Détaillez les circonstances, ce que vous avez observé ou appris..."
              value={factContent}
              onChange={(e) => setFactContent(e.target.value)}
              rows={5}
              className="resize-none min-h-[120px]"
            />
          </div>

          {/* Optional attachment */}
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
                Ajouter un document (facture, photo, rapport) renforce la crédibilité de votre contribution.
              </p>

              {!uploadedFile && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm">Cliquez pour sélectionner un fichier</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF, MP4</p>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setUploadedFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {uploadedFile.progress >= 0 && uploadedFile.progress < 100 && (
                    <Progress value={uploadedFile.progress} className="h-1" />
                  )}
                  {uploadedFile.progress === 100 && (
                    <>
                      <Select
                        value={uploadedFile.evidenceType}
                        onValueChange={(v) => setUploadedFile({ ...uploadedFile, evidenceType: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Type de document" />
                        </SelectTrigger>
                        <SelectContent>
                          {EVIDENCE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Description optionnelle"
                        value={uploadedFile.description}
                        onChange={(e) => setUploadedFile({ ...uploadedFile, description: e.target.value })}
                        className="h-9"
                      />
                    </>
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

          <Button className="w-full" disabled={!canProceed || uploading} onClick={() => setStep(2)}>
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            Vérifier et déposer
          </Button>
        </div>
      )}

      {/* STEP 2 - Review */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold">Vérifiez votre contribution</h3>

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
                  Date : {newEventDate}{newEventDateApprox ? " (approximative)" : ""}
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <p className="font-medium mb-1">Contribution :</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{factContent}</p>
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

            {isAnonymous && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border text-muted-foreground">
                <EyeOff className="w-4 h-4" />
                <span>Dépôt anonyme</span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive p-3 rounded-lg bg-destructive/10">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Déposer ma contribution
          </Button>
        </div>
      )}
    </Card>
  );
}

function ConditionalFieldRow({
  field,
  value,
  visibility,
  onChange,
  onVisibilityChange,
}: {
  field: FieldDef;
  value: string | boolean | undefined;
  visibility: boolean;
  onChange: (v: string) => void;
  onVisibilityChange: (v: boolean) => void;
}) {
  const labelEl = (
    <label className="text-xs font-medium text-foreground block">
      {field.label}
      {!field.optional && <span className="text-destructive"> *</span>}
      {field.optional && <span className="text-muted-foreground"> (optionnel)</span>}
    </label>
  );
  const strVal = typeof value === "string" ? value : "";

  return (
    <div className="space-y-1.5">
      {labelEl}
      {field.kind === "select" && field.options && (
        <Select value={strVal} onValueChange={onChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sélectionner…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {field.kind === "text" && (
        <Input
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="h-9"
        />
      )}
      {field.kind === "number" && (
        <>
          <Input
            type="number"
            inputMode="numeric"
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="h-9"
          />
          {field.visibilityKey && (
            <div className="flex items-start justify-between gap-3 p-2 rounded bg-background/60 border border-border/40">
              <div className="text-[11px] text-muted-foreground leading-snug">
                <span className="font-medium text-foreground">
                  {field.visibilityLabel ?? "Rendre visible publiquement"}
                </span>
                <br />
                Désactivé par défaut. Vous pourrez le modifier à tout moment.
              </div>
              <Switch
                checked={visibility}
                onCheckedChange={onVisibilityChange}
                className="mt-0.5"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
