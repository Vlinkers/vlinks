import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  FileSearch,
  FileText,
  MessageCircle,
  Wrench,
  Camera,
  Eye,
  XCircle,
  Upload,
  X,
  Plus,
  Image as ImageIcon,
  File,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const contributionTypes = [
  {
    value: "inspection_report",
    label: "Rapport d'inspection",
    icon: FileSearch,
    description: "Inspection professionnelle ou pré-achat",
  },
  {
    value: "vehicle_history",
    label: "Historique véhicule",
    icon: FileText,
    description: "Carfax, CarVertical ou autre rapport d'historique",
  },
  {
    value: "owner_exchange",
    label: "Échange avec vendeur",
    icon: MessageCircle,
    description: "Conversations avec le propriétaire ou concessionnaire",
  },
  {
    value: "mechanic_conversation",
    label: "Avis mécanicien",
    icon: Wrench,
    description: "Opinion de votre mécanicien ou garagiste",
  },
  {
    value: "photo_evidence",
    label: "Preuves photo",
    icon: Camera,
    description: "Photos détaillées du véhicule",
  },
  {
    value: "observation",
    label: "Observation personnelle",
    icon: Eye,
    description: "Notes, red flags, ou observations lors de la visite",
  },
  {
    value: "purchase_decision",
    label: "Décision d'achat",
    icon: XCircle,
    description: "Pourquoi vous avez acheté ou renoncé",
  },
] as const;

const contributionSchema = z.object({
  contribution_type: z.enum([
    "inspection_report",
    "vehicle_history",
    "owner_exchange",
    "mechanic_conversation",
    "photo_evidence",
    "observation",
    "purchase_decision",
  ]),
  title: z
    .string()
    .trim()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères"),
  summary: z
    .string()
    .trim()
    .min(20, "Le résumé doit contenir au moins 20 caractères")
    .max(500, "Le résumé ne peut pas dépasser 500 caractères"),
  details: z
    .string()
    .trim()
    .max(5000, "Les détails ne peuvent pas dépasser 5000 caractères")
    .optional(),
  is_anonymous: z.boolean().default(false),
  decision: z.enum(["purchased", "passed", "none"]).optional(),
  pass_reason: z
    .string()
    .trim()
    .max(300, "La raison ne peut pas dépasser 300 caractères")
    .optional(),
  tags: z.array(z.string()).max(5, "Maximum 5 tags autorisés").optional(),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface ContributionFormProps {
  vinId: string;
  vin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ContributionForm({
  vinId,
  vin,
  open,
  onOpenChange,
  onSuccess,
}: ContributionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      is_anonymous: false,
      decision: "none",
      tags: [],
    },
  });

  const contributionType = watch("contribution_type");
  const decision = watch("decision");

  const handleDocumentUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const newFiles = Array.from(files).slice(0, 5 - documents.length);
        setDocuments((prev) => [...prev, ...newFiles]);
      }
    },
    [documents.length]
  );

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const newFiles = Array.from(files).filter((f) =>
          f.type.startsWith("image/")
        );
        setPhotos((prev) => [...prev, ...newFiles].slice(0, 10));
      }
    },
    []
  );

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && tags.length < 5 && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      setValue("tags", newTags);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    setValue("tags", newTags);
  };

  const onSubmit = async (data: ContributionFormData) => {
    setIsSubmitting(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour contribuer",
          variant: "destructive",
        });
        return;
      }

      // Create contribution
      const { data: contribution, error: contributionError } = await supabase
        .from("vin_contributions")
        .insert({
          vin_id: vinId,
          user_id: user.id,
          contribution_type: data.contribution_type,
          title: data.title,
          summary: data.summary,
          details: data.details || null,
          is_anonymous: data.is_anonymous,
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

      // Upload photos
      for (const photo of photos) {
        const filePath = `${user.id}/${contribution.id}/${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from("vin-photos")
          .upload(filePath, photo);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("vin-photos")
            .getPublicUrl(filePath);

          await supabase.from("contribution_photos").insert({
            contribution_id: contribution.id,
            file_name: photo.name,
            file_path: urlData.publicUrl,
          });
        }
      }

      // Add tags
      for (const tag of tags) {
        await supabase.from("contribution_tags").insert({
          contribution_id: contribution.id,
          tag,
        });
      }

      toast({
        title: "Contribution ajoutée",
        description: "Merci de contribuer à la chaîne de vérité!",
      });

      // Reset form
      reset();
      setDocuments([]);
      setPhotos([]);
      setTags([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting contribution:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = contributionTypes.find(
    (t) => t.value === contributionType
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Ajouter un maillon de vérité
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            VIN: <span className="font-mono">{vin}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Texte pédagogique */}
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
          <p className="text-sm text-foreground">
            Vous avez déjà payé pour cette information. En la partageant, vous aidez les prochains acheteurs et gagnez des crédits.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>⏱️</span>
            <span>2–5 minutes · Contribution anonyme possible</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Contribution Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Que souhaitez-vous partager ?
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contributionTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = contributionType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setValue("contribution_type", type.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/50 bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? "bg-primary/20" : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`font-medium ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {type.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.contribution_type && (
              <p className="text-sm text-danger">
                Veuillez sélectionner un type
              </p>
            )}
            {/* Indicateur de valeur */}
            <p className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
              <span>🎁</span>
              <span>Cette contribution peut vous rapporter des crédits</span>
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Résumez votre contribution en une phrase"
              className="bg-muted/30"
            />
            {errors.title && (
              <p className="text-sm text-danger">{errors.title.message}</p>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Résumé *</Label>
            <Textarea
              id="summary"
              {...register("summary")}
              placeholder="Décrivez brièvement ce que vous avez découvert..."
              rows={3}
              className="bg-muted/30 resize-none"
            />
            {errors.summary && (
              <p className="text-sm text-danger">{errors.summary.message}</p>
            )}
          </div>

          {/* Details */}
          <div className="space-y-2">
            <Label htmlFor="details">Détails (optionnel)</Label>
            <Textarea
              id="details"
              {...register("details")}
              placeholder="Ajoutez tous les détails pertinents: observations techniques, contexte de la visite, conversations importantes..."
              rows={5}
              className="bg-muted/30 resize-none"
            />
            {errors.details && (
              <p className="text-sm text-danger">{errors.details.message}</p>
            )}
          </div>

          {/* Purchase Decision (for purchase_decision type) */}
          {contributionType === "purchase_decision" && (
            <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border">
              <Label className="text-base font-semibold">
                Quelle a été votre décision?
              </Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setValue("decision", "purchased")}
                  className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    decision === "purchased"
                      ? "border-success bg-success/10 text-success"
                      : "border-border hover:border-success/50"
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">J'ai acheté</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue("decision", "passed")}
                  className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    decision === "passed"
                      ? "border-warning bg-warning/10 text-warning"
                      : "border-border hover:border-warning/50"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">J'ai renoncé</span>
                </button>
              </div>
              {decision === "passed" && (
                <div className="space-y-2">
                  <Label htmlFor="pass_reason">
                    Pourquoi avez-vous renoncé?
                  </Label>
                  <Input
                    id="pass_reason"
                    {...register("pass_reason")}
                    placeholder="Ex: Prix trop élevé, défauts cachés, mauvais feeling..."
                    className="bg-background/50"
                  />
                </div>
              )}
            </div>
          )}

          {/* Documents Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <File className="w-4 h-4" />
              Documents ({documents.length}/5)
            </Label>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
                >
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm truncate max-w-[150px]">
                    {doc.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDocument(index)}
                    className="text-muted-foreground hover:text-danger"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {documents.length < 5 && (
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Ajouter</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleDocumentUpload}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    multiple
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PDF, DOC, images. Max 5 fichiers.
            </p>
          </div>

          {/* Photos Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photos ({photos.length}/10)
            </Label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-danger text-danger-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 10 && (
                <label className="aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                  <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Ajouter</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    multiple
                  />
                </label>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags ({tags.length}/5)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-danger"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {tags.length < 5 && (
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Ex: Sans accident, Bon état..."
                  className="bg-muted/30"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
            <div>
              <Label htmlFor="anonymous" className="font-medium">
                Contribution anonyme
              </Label>
              <p className="text-sm text-muted-foreground">
                Votre nom ne sera pas affiché publiquement
              </p>
            </div>
            <Switch
              id="anonymous"
              checked={watch("is_anonymous")}
              onCheckedChange={(checked) => setValue("is_anonymous", checked)}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="hero"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Envoi en cours..." : "Ajouter ce maillon"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
