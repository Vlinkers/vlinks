import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, CheckCircle, Loader2, Upload, X,
  FileText, Image as ImageIcon, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { EVIDENCE_MEDIA_TYPE } from "@/lib/mediaClassification";
import {
  VISIT_TYPE_OPTIONS, SYSTEM_GROUPS, SYSTEM_LABELS, SYSTEM_SCHEMAS,
  PERFORMED_BY_OPTIONS, buildMaintenanceTitle,
  type VisitType, type SystemKey, type SystemEntry, type PerformedBy,
  type MaintenanceData,
} from "@/lib/maintenanceLogTypes";
import type { Tables } from "@/integrations/supabase/types";

type Contributor = Tables<"contributors">;

interface MaintenanceLogFormProps {
  vinId: string;
  contributor: Contributor;
  onComplete: () => void;
  onBack: () => void;
}

interface UploadedFile {
  id: string;
  file: File;
  storagePath: string;
  bucket: "vin-photos" | "vin-documents";
  evidenceType: string;
  preview?: string;
  progress: number;
}

const STEPS = ["Type", "Systèmes", "Détails", "Infos", "Confirmation"];

export function MaintenanceLogForm({ vinId, contributor, onComplete, onBack }: MaintenanceLogFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);

  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [selectedSystems, setSelectedSystems] = useState<SystemKey[]>([]);
  const [systemEntries, setSystemEntries] = useState<Record<string, SystemEntry>>({});

  // Step 4
  const [visitDate, setVisitDate] = useState("");
  const [dateApprox, setDateApprox] = useState(false);
  const [mileage, setMileage] = useState("");
  const [performedBy, setPerformedBy] = useState<PerformedBy | "">("");
  const [garageName, setGarageName] = useState("");
  const [cost, setCost] = useState("");
  const [costHidden, setCostHidden] = useState(false);
  const [extraNote, setExtraNote] = useState("");

  // Files
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSystem = (key: SystemKey) => {
    setSelectedSystems((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      // Initialize entries on add
      setSystemEntries((entries) => {
        if (next.includes(key) && !entries[key]) {
          return { ...entries, [key]: { system: key, details: {} } };
        }
        if (!next.includes(key) && entries[key]) {
          const { [key]: _, ...rest } = entries;
          return rest;
        }
        return entries;
      });
      return next;
    });
  };

  const updateEntry = (sys: SystemKey, patch: Partial<SystemEntry>) => {
    setSystemEntries((e) => ({ ...e, [sys]: { ...e[sys], ...patch, system: sys } }));
  };
  const updateDetail = (sys: SystemKey, key: string, value: unknown) => {
    setSystemEntries((e) => ({
      ...e,
      [sys]: {
        ...e[sys],
        system: sys,
        details: { ...(e[sys]?.details ?? {}), [key]: value },
      },
    }));
  };

  const canStep1 = !!visitType;
  const canStep2 = selectedSystems.length > 0;
  const canStep3 = true; // all detail fields are optional
  const canStep4 = !!visitDate && !!mileage && !!performedBy;

  const handleFiles = useCallback(async (filesIn: FileList | null) => {
    if (!filesIn) return;
    setUploading(true);
    for (const file of Array.from(filesIn)) {
      const id = crypto.randomUUID();
      const ext = file.name.split(".").pop() ?? "bin";
      const isImage = file.type.startsWith("image");
      const bucket: "vin-photos" | "vin-documents" = isImage ? "vin-photos" : "vin-documents";
      const storagePath = `${vinId}/${id}.${ext}`;
      const entry: UploadedFile = {
        id, file, storagePath, bucket,
        evidenceType: isImage ? "photo" : "other",
        preview: isImage ? URL.createObjectURL(file) : undefined,
        progress: 30,
      };
      setFiles((f) => [...f, entry]);
      const { error: upErr } = await supabase.storage.from(bucket).upload(storagePath, file, { upsert: false });
      if (upErr) {
        entry.progress = -1;
      } else {
        entry.progress = 100;
      }
      setFiles((f) => f.map((x) => (x.id === id ? { ...entry } : x)));
    }
    setUploading(false);
  }, [vinId]);

  const removeFile = (id: string) => setFiles((f) => f.filter((x) => x.id !== id));

  const handleSubmit = async () => {
    if (!visitType) return;
    setSubmitting(true);
    setError(null);
    try {
      const maintenanceData: MaintenanceData = {
        visit_type: visitType,
        systems: selectedSystems.map((k) => systemEntries[k] ?? { system: k }),
        performed_by: (performedBy || undefined) as PerformedBy | undefined,
        garage_name: garageName.trim() || undefined,
        cost: cost ? Number(cost) : undefined,
        cost_visible: !costHidden,
        extra_note: extraNote.trim() || undefined,
      };

      const title = buildMaintenanceTitle(maintenanceData);

      // Map visit_type → event_type
      const eventTypeMap: Record<VisitType, string> = {
        entretien_regulier: "maintenance",
        probleme_alerte: "repair",
        rappel_constructeur: "recall",
        modification: "modification",
        inspection_controle: "inspection",
      };

      const { data: evt, error: evtErr } = await supabase
        .from("events")
        .insert({
          vin_id: vinId,
          event_type: eventTypeMap[visitType] as "maintenance",
          title,
          event_date: visitDate || null,
          event_date_precision: dateApprox ? "approximate" : "exact",
          mileage_at_event: mileage ? parseInt(mileage) : null,
        })
        .select("id")
        .single();
      if (evtErr) throw evtErr;

      const factContent =
        extraNote.trim() ||
        maintenanceData.systems
          .map((s) => {
            const lbl = s.system === "autre" && s.custom_label ? s.custom_label : SYSTEM_LABELS[s.system];
            return s.mechanic_note ? `${lbl} — ${s.mechanic_note}` : lbl;
          })
          .join(" · ");

      const { data: fact, error: factErr } = await supabase
        .from("facts")
        .insert({
          event_id: evt.id,
          contributor_id: contributor.id,
          face: contributor.face,
          content: factContent,
          is_anonymous: false,
          metadata: { maintenance: maintenanceData } as never,
        })
        .select("id")
        .single();
      if (factErr) throw factErr;

      // Attach uploaded evidence
      for (const f of files) {
        if (f.progress !== 100) continue;
        await supabase.from("evidence").insert({
          fact_id: fact.id,
          evidence_type: f.evidenceType,
          media_type: EVIDENCE_MEDIA_TYPE.maintenanceEvidence,
          file_type: f.file.type,
          file_name: f.file.name,
          file_path: `${f.bucket}/${f.storagePath}`,
          file_size: f.file.size,
        } as never);
      }

      setSubmitted(true);
      setTimeout(onComplete, 1800);
    } catch (err) {
      console.error("Maintenance log submit error:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 text-center space-y-3 border-border bg-card">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="font-display text-lg font-semibold">Entrée enregistrée dans le carnet</h3>
        <p className="text-sm text-muted-foreground">Votre entrée sera publiée après validation.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-5 border-border bg-card max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={step === 1 ? onBack : () => setStep(step - 1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {step === 1 ? "Fermer" : "Précédent"}
        </Button>
        <p className="text-xs font-medium text-muted-foreground">Étape {step} / 5</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const isActive = n === step;
          const isDone = n < step;
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-1.5 w-full rounded-full transition-all",
                  isActive ? "bg-primary" : isDone ? "bg-primary/40" : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight text-center hidden sm:block",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {n}. {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* STEP 1 — Visit type */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Quel type d'intervention ?</h3>
            <p className="text-sm text-muted-foreground">Choisissez la nature de la visite à enregistrer.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {VISIT_TYPE_OPTIONS.map((opt) => {
              const isSelected = visitType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisitType(opt.value)}
                  className={cn(
                    "text-left p-4 rounded-lg border-2 transition-all hover:border-primary/60 hover:bg-primary/5",
                    isSelected ? "border-primary bg-primary/10" : "border-border bg-card"
                  )}
                >
                  <div className="text-2xl mb-1.5">{opt.icon}</div>
                  <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2 — Systems */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Quels systèmes sont concernés ?</h3>
            <p className="text-sm text-muted-foreground">
              Sélectionnez un ou plusieurs systèmes. Des champs détaillés apparaîtront pour chaque système.
            </p>
          </div>
          <div className="space-y-3">
            {SYSTEM_GROUPS.map((g) => (
              <div key={g.label}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {g.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.systems.map((s) => {
                    const active = selectedSystems.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleSystem(s.key)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3 — Per-system details */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Détails par système</h3>
            <p className="text-sm text-muted-foreground">
              Tous les champs sont optionnels — remplissez ce que vous savez.
            </p>
          </div>
          <div className="space-y-4">
            {selectedSystems.map((sys) => (
              <SystemDetailBlock
                key={sys}
                system={sys}
                entry={systemEntries[sys] ?? { system: sys }}
                onUpdateEntry={(patch) => updateEntry(sys, patch)}
                onUpdateDetail={(k, v) => updateDetail(sys, k, v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* STEP 4 — General info */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Informations générales</h3>
            <p className="text-sm text-muted-foreground">Date, kilométrage, prestataire et pièces jointes.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date de la visite <span className="text-destructive">*</span></label>
              <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={dateApprox} onCheckedChange={(v) => setDateApprox(!!v)} />
                Date approximative
              </label>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kilométrage <span className="text-destructive">*</span></label>
              <Input type="number" placeholder="ex. 92500" value={mileage} onChange={(e) => setMileage(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Effectué par <span className="text-destructive">*</span></label>
            <Select value={performedBy} onValueChange={(v) => setPerformedBy(v as PerformedBy)}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez le prestataire" /></SelectTrigger>
              <SelectContent>
                {PERFORMED_BY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom du garage (optionnel)</label>
            <Input value={garageName} onChange={(e) => setGarageName(e.target.value)} placeholder="ex. Porsche Centre Ville" />
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-3 sm:items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Coût total (optionnel)</label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="ex. 450" />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <Switch checked={costHidden} onCheckedChange={setCostHidden} />
              Masquer le prix
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pièces jointes (factures, photos)</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-md p-4 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
            >
              <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Cliquez pour ajouter des fichiers</p>
            </div>
            {files.length > 0 && (
              <ul className="space-y-1.5 mt-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 p-2 rounded border border-border/60 bg-muted/30">
                    {f.preview ? (
                      <img src={f.preview} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : f.file.type.startsWith("image") ? (
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="flex-1 text-xs truncate">{f.file.name}</span>
                    {f.progress === 100 ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : f.progress < 0 ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    <button type="button" onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes additionnelles (optionnel)</label>
            <Textarea
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              rows={3}
              placeholder="Tout détail utile que vous voulez ajouter."
              className="resize-none"
            />
          </div>
        </div>
      )}

      {/* STEP 5 — Confirmation */}
      {step === 5 && visitType && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Vérifiez avant d'enregistrer</h3>
            <p className="text-sm text-muted-foreground">Cette entrée apparaîtra dans le carnet d'entretien après validation.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>Type de visite :</strong> {VISIT_TYPE_OPTIONS.find((o) => o.value === visitType)?.label}</p>
            <p><strong>Date :</strong> {visitDate || "—"}{dateApprox ? " (approx.)" : ""}</p>
            <p><strong>Kilométrage :</strong> {mileage ? `${Number(mileage).toLocaleString("fr-CA")} km` : "—"}</p>
            <p><strong>Effectué par :</strong> {performedBy ? PERFORMED_BY_OPTIONS.find((o) => o.value === performedBy)?.label : "—"}{garageName ? ` — ${garageName}` : ""}</p>
            <p><strong>Systèmes :</strong> {selectedSystems.map((s) => SYSTEM_LABELS[s]).join(", ") || "—"}</p>
            {cost && <p><strong>Coût :</strong> {Number(cost).toLocaleString("fr-CA")} $ {costHidden ? "(masqué)" : ""}</p>}
            {files.length > 0 && <p><strong>Pièces jointes :</strong> {files.length} fichier{files.length > 1 ? "s" : ""}</p>}
          </div>
          {error && (
            <div className="p-3 rounded border border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        {step < 5 && (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && !canStep1) ||
              (step === 2 && !canStep2) ||
              (step === 3 && !canStep3) ||
              (step === 4 && !canStep4) ||
              uploading
            }
            className="w-full sm:w-auto"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
        {step === 5 && (
          <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
            {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            → Enregistrer dans le carnet
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── Per-system detail block ────────────────────────────────────────────────
function SystemDetailBlock({
  system,
  entry,
  onUpdateEntry,
  onUpdateDetail,
}: {
  system: SystemKey;
  entry: SystemEntry;
  onUpdateEntry: (patch: Partial<SystemEntry>) => void;
  onUpdateDetail: (key: string, value: unknown) => void;
}) {
  const schema = SYSTEM_SCHEMAS[system];
  const label = system === "autre" ? "Autre système" : SYSTEM_LABELS[system];
  const details = (entry.details ?? {}) as Record<string, unknown>;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <p className="font-display text-sm font-semibold text-foreground">{label}</p>

      {system === "autre" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Précisez le système</label>
          <Input
            value={entry.custom_label ?? ""}
            onChange={(e) => onUpdateEntry({ custom_label: e.target.value })}
            placeholder="ex. Toit ouvrant"
          />
        </div>
      )}

      {schema?.intervention && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium">{schema.intervention.label}</label>
          <Select
            value={entry.intervention_type ?? ""}
            onValueChange={(v) => onUpdateEntry({ intervention_type: v })}
          >
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {schema.intervention.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!schema && system !== "autre" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Type d'intervention</label>
          <Input
            value={entry.intervention_type ?? ""}
            onChange={(e) => onUpdateEntry({ intervention_type: e.target.value })}
            placeholder="ex. Inspection, remplacement…"
          />
        </div>
      )}

      {schema?.fields.map((f) => {
        const val = details[f.key];
        if (f.kind === "text") {
          return (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium">{f.label}</label>
              <Input
                value={(val as string) ?? ""}
                onChange={(e) => onUpdateDetail(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          );
        }
        if (f.kind === "number") {
          return (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium">
                {f.label}{f.unit ? ` (${f.unit})` : ""}
              </label>
              <Input
                type="number"
                value={(val as string | number) ?? ""}
                onChange={(e) => onUpdateDetail(f.key, e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={f.placeholder}
              />
            </div>
          );
        }
        if (f.kind === "textarea") {
          return (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium">{f.label}</label>
              <Textarea
                value={(val as string) ?? ""}
                onChange={(e) => onUpdateDetail(f.key, e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          );
        }
        if (f.kind === "slider") {
          const numVal = typeof val === "number" ? val : 0;
          return (
            <div key={f.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">{f.label}</label>
                <span className="text-xs font-semibold tabular-nums">{numVal}{f.unit ?? ""}</span>
              </div>
              <Slider
                value={[numVal]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => onUpdateDetail(f.key, v[0])}
              />
            </div>
          );
        }
        if (f.kind === "radio" && f.options) {
          return (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium">{f.label}</label>
              <div className="flex flex-wrap gap-1.5">
                {f.options.map((o) => {
                  const active = val === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => onUpdateDetail(f.key, o.value)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs border transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        if (f.kind === "checkboxes" && f.options) {
          const arr = Array.isArray(val) ? (val as string[]) : [];
          return (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium">{f.label}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {f.options.map((o) => {
                  const checked = arr.includes(o.value);
                  return (
                    <label
                      key={o.value}
                      className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v
                            ? Array.from(new Set([...arr, o.value]))
                            : arr.filter((x) => x !== o.value);
                          onUpdateDetail(f.key, next);
                        }}
                      />
                      {o.label}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }
        return null;
      })}

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Note du garagiste (optionnel)</label>
        <Textarea
          value={entry.mechanic_note ?? ""}
          onChange={(e) => onUpdateEntry({ mechanic_note: e.target.value })}
          rows={2}
          className="resize-none"
          placeholder="Toute note ou remarque du professionnel."
        />
      </div>
    </div>
  );
}
