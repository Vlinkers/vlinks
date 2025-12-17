import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Upload,
  X,
  FileText,
  Wrench,
  Calendar as CalendarIcon,
  Gauge,
  CheckCircle,
  Loader2,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const interventionTypes = [
  { value: "entretien_regulier", label: "Entretien régulier", description: "Vidange, filtres, révision" },
  { value: "reparation", label: "Réparation", description: "Correction d'un problème identifié" },
  { value: "rappel_constructeur", label: "Rappel constructeur", description: "Intervention suite à un rappel officiel" },
  { value: "remplacement_piece", label: "Remplacement de pièce", description: "Changement de pièce d'usure ou défectueuse" },
  { value: "autre", label: "Autre", description: "Intervention non catégorisée" },
];

const ownerContributionSchema = z.object({
  intervention_type: z.string().min(1, "Veuillez sélectionner un type d'intervention"),
  intervention_date: z.date({
    required_error: "La date est obligatoire",
  }),
  mileage: z.number({
    required_error: "Le kilométrage est obligatoire",
  }).min(0, "Le kilométrage doit être positif"),
  description: z
    .string()
    .trim()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(2000, "La description ne peut pas dépasser 2000 caractères"),
});

type OwnerContributionFormData = z.infer<typeof ownerContributionSchema>;

interface OwnerContributionFormProps {
  vinId: string;
  vin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function OwnerContributionForm({
  vinId,
  vin,
  open,
  onOpenChange,
  onSuccess,
}: OwnerContributionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'submitting' | 'processing' | 'done' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OwnerContributionFormData>({
    resolver: zodResolver(ownerContributionSchema),
  });

  const interventionType = watch("intervention_type");
  const interventionDate = watch("intervention_date");

  const handleDocumentUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const newFiles = Array.from(files).slice(0, 3 - documents.length);
        setDocuments((prev) => [...prev, ...newFiles]);
      }
    },
    [documents.length]
  );

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: OwnerContributionFormData) => {
    setIsSubmitting(true);
    setProcessingStatus('submitting');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour contribuer",
          variant: "destructive",
        });
        return;
      }

      // Create raw contribution with owner flag
      const { data: rawContribution, error: rawError } = await supabase
        .from("raw_contributions")
        .insert({
          vin_id: vinId,
          user_id: user.id,
          contribution_type: "vehicle_history",
          title: `Intervention propriétaire - ${interventionTypes.find(t => t.value === data.intervention_type)?.label || data.intervention_type}`,
          summary: data.description,
          details: null,
          is_anonymous: false,
          is_owner_contribution: true,
          intervention_type: data.intervention_type,
          intervention_date: format(data.intervention_date, "yyyy-MM-dd"),
          mileage_at_intervention: data.mileage,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (rawError) throw rawError;

      // Also create legacy contribution for backwards compatibility
      const { data: contribution, error: contributionError } = await supabase
        .from("vin_contributions")
        .insert({
          vin_id: vinId,
          user_id: user.id,
          contribution_type: "vehicle_history",
          title: `Intervention propriétaire - ${interventionTypes.find(t => t.value === data.intervention_type)?.label || data.intervention_type}`,
          summary: data.description,
          details: `Date: ${format(data.intervention_date, "dd/MM/yyyy")} | Kilométrage: ${data.mileage.toLocaleString()} km`,
          is_anonymous: false,
        })
        .select()
        .single();

      if (contributionError) throw contributionError;

      // Upload documents
      for (const doc of documents) {
        const filePath = `${user.id}/${contribution.id}/${doc.name}`;
        const { error: uploadError } = await supabase.storage
          .from("vin-documents")
          .upload(filePath, doc);

        if (!uploadError) {
          await supabase.from("contribution_documents").insert({
            contribution_id: contribution.id,
            file_name: doc.name,
            file_path: filePath,
            file_type: doc.type,
            file_size: doc.size,
          });
        }
      }

      // Trigger AI processing
      setProcessingStatus('processing');
      
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        'process-contribution',
        {
          body: { contribution_id: rawContribution.id },
        }
      );

      if (processError) {
        console.error("Error processing contribution:", processError);
        toast({
          title: "Contribution enregistrée",
          description: "Votre historique sera analysé sous peu.",
        });
      } else if (processResult?.success) {
        setProcessingStatus('done');
        toast({
          title: "Historique ajouté",
          description: "Votre contribution propriétaire a été analysée et ajoutée au dossier.",
        });
      } else {
        toast({
          title: "Contribution enregistrée",
          description: "Votre historique sera analysé sous peu.",
        });
      }

      reset();
      setDocuments([]);
      setProcessingStatus('idle');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting owner contribution:", error);
      setProcessingStatus('error');
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <User className="w-6 h-6 text-success" />
            Historique d'entretien déclaré par le propriétaire
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            VIN: <span className="font-mono">{vin}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Sous-titre explicatif */}
        <div className="bg-success/10 border border-success/30 rounded-xl p-4">
          <p className="text-sm text-foreground font-medium">
            Informations factuelles, datées et documentées.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Votre historique sera reformulé de manière neutre par VLINKS avant publication.
          </p>
        </div>

        {/* Note d'information */}
        <div className="bg-muted/30 border border-border rounded-xl p-4">
          <p className="text-sm text-foreground">
            En tant que propriétaire, vous documentez l'historique d'entretien. Vos contributions sont distinctes des observations tierces.
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <span>🏷️</span>
            <span>Toutes vos contributions seront identifiées comme « Source : propriétaire du véhicule »</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Intervention Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Type d'intervention <span className="text-danger">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {interventionTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue("intervention_type", type.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    interventionType === type.value
                      ? "border-success bg-success/10"
                      : "border-border hover:border-muted-foreground/50 bg-muted/30"
                  }`}
                >
                  <p className={`font-medium text-sm ${
                    interventionType === type.value ? "text-success" : "text-foreground"
                  }`}>
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
            {errors.intervention_type && (
              <p className="text-sm text-danger">{errors.intervention_type.message}</p>
            )}
          </div>

          {/* Date and Mileage Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Intervention Date */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Date de l'intervention <span className="text-danger">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !interventionDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {interventionDate ? (
                      format(interventionDate, "PPP", { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={interventionDate}
                    onSelect={(date) => date && setValue("intervention_date", date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.intervention_date && (
                <p className="text-sm text-danger">{errors.intervention_date.message}</p>
              )}
            </div>

            {/* Mileage */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Kilométrage <span className="text-danger">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Ex: 85000"
                  {...register("mileage", { valueAsNumber: true })}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  km
                </span>
              </div>
              {errors.mileage && (
                <p className="text-sm text-danger">{errors.mileage.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Description factuelle <span className="text-danger">*</span>
            </Label>
            <Textarea
              placeholder="Décrivez ce qui a été fait, sans justification ni commentaire..."
              {...register("description")}
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Ces informations seront reformulées automatiquement. Décrivez uniquement les faits.
            </p>
            {errors.description && (
              <p className="text-sm text-danger">{errors.description.message}</p>
            )}
          </div>

          {/* Documents */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Document associé
              <span className="text-xs font-normal text-muted-foreground">(fortement recommandé)</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              🔒 Les documents originaux ne sont jamais publiés. Ils servent uniquement à renforcer la crédibilité de l'historique.
            </p>
            
            {documents.length < 3 && (
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-success/50 transition-colors bg-muted/20">
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">
                  Facture, bon de travail, ordre de réparation
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, JPG, PNG (max 3 fichiers)
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </label>
            )}

            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-success" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(doc.size / 1024).toFixed(1)} Ko
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Process Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success/60"></span>
              Transmission
            </span>
            <span className="text-muted-foreground/50">→</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success/40"></span>
              Analyse VLINKS
            </span>
            <span className="text-muted-foreground/50">→</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success/40"></span>
              Reformulation
            </span>
            <span className="text-muted-foreground/50">→</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success/40"></span>
              Publication
            </span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="hero"
            className="w-full bg-success hover:bg-success/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {processingStatus === 'processing' ? "Analyse en cours..." : "Envoi en cours..."}
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4 mr-2" />
                Ajouter cet entretien à l'historique
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Cette contribution sera identifiée comme provenant du propriétaire du véhicule.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
