import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Wrench,
  Car,
  AlertTriangle,
  FileText,
  ClipboardList,
  Upload,
  X,
  Plus,
  Image as ImageIcon,
  File,
  CheckCircle,
  Shield,
  User,
  Loader2,
  Calendar,
  Gauge,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Owner-specific contribution types (5 types)
const ownerContributionTypes = [
  {
    value: "maintenance_repair",
    label: "Entretien & réparations",
    icon: Wrench,
    description: "Factures d'entretien, réparations, dates et kilométrage",
  },
  {
    value: "usage_history",
    label: "Historique d'usage",
    icon: Car,
    description: "Durée de possession, type d'usage, fréquence d'entretien",
  },
  {
    value: "notable_events",
    label: "Événements notables",
    icon: AlertTriangle,
    description: "Pannes, bruits, problèmes observés et résolutions",
  },
  {
    value: "documents",
    label: "Documents",
    icon: FileText,
    description: "Factures, rapports, rappels constructeur",
  },
  {
    value: "owner_notes",
    label: "Notes factuelles",
    icon: ClipboardList,
    description: "Observations objectives, sans jugement ni intention commerciale",
  },
] as const;

const verificationDocumentTypes = [
  { value: "facture", label: "Facture récente", description: "Facture d'entretien ou de réparation" },
  { value: "assurance", label: "Certificat d'assurance", description: "Document d'assurance actif" },
  { value: "carte_grise", label: "Carte grise (masquée)", description: "Carte grise avec informations personnelles masquées" },
  { value: "autre", label: "Autre document", description: "Tout document prouvant la propriété" },
];

// Map owner types to existing DB enum types
const ownerTypeToDbType: Record<string, string> = {
  maintenance_repair: "vehicle_history",
  usage_history: "observation",
  notable_events: "observation",
  documents: "vehicle_history",
  owner_notes: "observation",
};

const contributionSchema = z.object({
  contribution_type: z.enum([
    "maintenance_repair",
    "usage_history",
    "notable_events",
    "documents",
    "owner_notes",
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
  intervention_date: z.string().optional(),
  mileage: z.string().optional(),
  intervention_type: z.string().optional(),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface OwnerContributionFormProps {
  vinId: string | null;
  vin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type FormStep = 'contribution' | 'verification';

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
  const [photos, setPhotos] = useState<File[]>([]);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'submitting' | 'processing' | 'done' | 'error'>('idle');
  
  // Owner verification state
  const [currentStep, setCurrentStep] = useState<FormStep>('contribution');
  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState<'none' | 'pending' | 'verified'>('none');
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);
  const [verificationDocumentType, setVerificationDocumentType] = useState<string>("");
  const [pendingVinId, setPendingVinId] = useState<string | null>(null);

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
    },
  });

  const contributionType = watch("contribution_type");

  // Check owner verification status on mount
  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (!open) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let checkVinId = vinId;
      if (!checkVinId) {
        const { data: existingVin } = await supabase
          .from("vins")
          .select("id")
          .eq("vin", vin)
          .maybeSingle();
        if (existingVin) checkVinId = existingVin.id;
      }

      if (checkVinId) {
        const { data: verification } = await supabase
          .from('owner_verifications')
          .select('verification_status')
          .eq('user_id', user.id)
          .eq('vin_id', checkVinId)
          .maybeSingle();

        if (verification) {
          if (verification.verification_status === 'verified') {
            setOwnerVerificationStatus('verified');
          } else if (verification.verification_status === 'pending') {
            setOwnerVerificationStatus('pending');
          }
        }
      }
    };

    checkOwnerStatus();
  }, [open, vinId, vin]);

  // Reset step when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep('contribution');
      setVerificationDocument(null);
      setVerificationDocumentType("");
      setPendingVinId(null);
      reset();
      setDocuments([]);
      setPhotos([]);
      setProcessingStatus('idle');
    }
  }, [open, reset]);

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

  const handleVerificationDocumentUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        const file = files[0];
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Fichier trop volumineux",
            description: "Le fichier ne doit pas dépasser 10 Mo",
            variant: "destructive",
          });
          return;
        }
        setVerificationDocument(file);
      }
    },
    [toast]
  );

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submitContribution = async (data: ContributionFormData, actualVinId: string, userId: string) => {
    setProcessingStatus('submitting');

    const dbContributionType = ownerTypeToDbType[data.contribution_type] || "observation";

    const { data: rawContribution, error: rawError } = await supabase
      .from("raw_contributions")
      .insert({
        vin_id: actualVinId,
        user_id: userId,
        contribution_type: dbContributionType as any,
        title: data.title,
        summary: data.summary,
        details: data.details || null,
        is_anonymous: data.is_anonymous,
        is_owner_contribution: true,
        intervention_date: data.intervention_date || null,
        mileage_at_intervention: data.mileage ? parseInt(data.mileage) : null,
        intervention_type: data.intervention_type || data.contribution_type,
        processing_status: 'pending',
      })
      .select()
      .single();

    if (rawError) throw rawError;

    const { data: contribution, error: contributionError } = await supabase
      .from("vin_contributions")
      .insert({
        vin_id: actualVinId,
        user_id: userId,
        contribution_type: dbContributionType as any,
        title: data.title,
        summary: data.summary,
        details: data.details || null,
        is_anonymous: data.is_anonymous,
      })
      .select()
      .single();

    if (contributionError) throw contributionError;

    for (const doc of documents) {
      const filePath = `${userId}/${contribution.id}/${doc.name}`;
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

    for (const photo of photos) {
      const filePath = `${userId}/${contribution.id}/${photo.name}`;
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
        description: "Votre contribution sera analysée sous peu.",
      });
    } else if (processResult?.success) {
      setProcessingStatus('done');
      toast({
        title: "Contribution analysée",
        description: processResult.publishable 
          ? "Votre contribution a été analysée et sera publiée." 
          : "Votre contribution a été analysée. Elle sera vérifiée par notre équipe.",
      });
    } else {
      toast({
        title: "Contribution enregistrée",
        description: "Votre contribution sera analysée sous peu.",
      });
    }

    reset();
    setDocuments([]);
    setPhotos([]);
    setProcessingStatus('idle');
    onOpenChange(false);
    onSuccess?.();
  };

  const onSubmit = async (data: ContributionFormData) => {
    setIsSubmitting(true);

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

      let actualVinId = vinId;
      if (!actualVinId) {
        const { data: existingVin } = await supabase
          .from("vins")
          .select("id")
          .eq("vin", vin)
          .maybeSingle();

        if (existingVin) {
          actualVinId = existingVin.id;
        } else {
          const { data: newVin, error: vinError } = await supabase
            .from("vins")
            .insert({ vin })
            .select("id")
            .single();

          if (vinError) throw vinError;
          actualVinId = newVin.id;
        }
      }

      // TOUJOURS soumettre la contribution d'abord
      await submitContribution(data, actualVinId, user.id);

      // APRÈS soumission réussie, si pas encore vérifié, proposer la vérification
      if (ownerVerificationStatus === 'none') {
        // Store VIN ID for verification step
        setPendingVinId(actualVinId);
        setCurrentStep('verification');
        // Don't close the dialog, show verification step
        return;
      }

      // Si déjà vérifié, fermer directement
      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error("Error submitting contribution:", error);
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

  const handleVerificationSubmit = async () => {
    if (!verificationDocument || !verificationDocumentType) {
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez sélectionner un type et téléverser un document",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive",
        });
        return;
      }

      // Use the VIN ID stored after contribution submission
      const actualVinId = pendingVinId || vinId;
      if (!actualVinId) {
        toast({
          title: "Erreur",
          description: "VIN non trouvé",
          variant: "destructive",
        });
        return;
      }

      const filePath = `${user.id}/${actualVinId}/${verificationDocument.name}`;
      const { error: uploadError } = await supabase.storage
        .from("owner-verification-docs")
        .upload(filePath, verificationDocument);

      if (uploadError) throw uploadError;

      const { error: verificationError } = await supabase
        .from("owner_verifications")
        .insert({
          user_id: user.id,
          vin_id: actualVinId,
          document_type: verificationDocumentType,
          document_path: filePath,
          verification_status: 'pending',
        });

      if (verificationError) throw verificationError;

      setOwnerVerificationStatus('pending');

      toast({
        title: "Merci !",
        description: "Votre contribution a été enregistrée et votre statut de propriétaire sera vérifié sous peu.",
      });

      // Close and cleanup
      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error("Error submitting verification:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler to skip verification
  const handleSkipVerification = () => {
    toast({
      title: "Contribution enregistrée",
      description: "Vous pourrez valider votre statut de propriétaire lors d'une prochaine contribution.",
    });
    onOpenChange(false);
    onSuccess?.();
  };

  // Verification step - shown AFTER contribution is submitted
  if (currentStep === 'verification') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="w-5 h-5 text-success" />
              Contribution enregistrée !
            </DialogTitle>
            <DialogDescription>
              Confirmez votre statut de propriétaire pour renforcer la crédibilité de vos contributions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Confirmation that contribution is saved */}
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-success mb-1">Votre contribution a été enregistrée</p>
                  <p className="text-muted-foreground">
                    Elle sera analysée et publiée indépendamment de la vérification ci-dessous.
                  </p>
                </div>
              </div>
            </div>

            {/* Verification explanation */}
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Pourquoi valider mon statut ?</p>
                  <p className="text-muted-foreground">
                    La preuve sert uniquement à confirmer votre statut de propriétaire. Elle n'est jamais publiée et ne bloque pas vos contributions.
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Une fois vérifié, vous n'aurez plus jamais à fournir ce document pour ce VIN.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Type de document</Label>
              <div className="grid grid-cols-1 gap-2">
                {verificationDocumentTypes.map((docType) => (
                  <button
                    key={docType.value}
                    type="button"
                    onClick={() => setVerificationDocumentType(docType.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      verificationDocumentType === docType.value
                        ? "border-success bg-success/10"
                        : "border-border hover:border-success/50"
                    }`}
                  >
                    <span className="font-medium text-sm">{docType.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {docType.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Téléverser le document</Label>
              {verificationDocument ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <File className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">{verificationDocument.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setVerificationDocument(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-success/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Cliquez ou glissez un fichier
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG (max 10 Mo)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleVerificationDocumentUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={handleVerificationSubmit}
                disabled={!verificationDocument || !verificationDocumentType || isSubmitting}
                className="w-full bg-success hover:bg-success/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  "Valider mon statut de propriétaire"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkipVerification}
                className="text-muted-foreground"
              >
                Passer cette étape
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="w-5 h-5 text-success" />
            Contribution propriétaire
          </DialogTitle>
          <DialogDescription>
            Documentez l'historique de votre véhicule. Vos informations sont analysées et reformulées automatiquement avant publication.
          </DialogDescription>
        </DialogHeader>

        {/* VIN display */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
          <Car className="w-5 h-5 text-muted-foreground" />
          <span className="font-mono text-sm">{vin}</span>
          {ownerVerificationStatus === 'verified' && (
            <span className="ml-auto text-xs bg-success/20 text-success px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Propriétaire vérifié
            </span>
          )}
          {ownerVerificationStatus === 'pending' && (
            <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
              Vérification en cours
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Contribution type selection - 5 owner-specific types */}
          <div className="space-y-3">
            <Label>Type de contribution</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ownerContributionTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = contributionType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setValue("contribution_type", type.value as any)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-success bg-success/10"
                        : "border-border hover:border-success/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-success" : "text-muted-foreground"}`} />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {errors.contribution_type && (
              <p className="text-sm text-destructive">{errors.contribution_type.message}</p>
            )}
          </div>

          {/* Form fields - only show when type is selected */}
          {contributionType && (
            <>
              {/* Intervention details for maintenance/events */}
              {(contributionType === 'maintenance_repair' || contributionType === 'notable_events') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="intervention_date" className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      Date
                    </Label>
                    <Input
                      id="intervention_date"
                      type="date"
                      {...register("intervention_date")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mileage" className="flex items-center gap-2 text-sm">
                      <Gauge className="w-4 h-4" />
                      Kilométrage
                    </Label>
                    <Input
                      id="mileage"
                      type="number"
                      placeholder="ex: 85000"
                      {...register("mileage")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="intervention_type" className="text-sm">Type d'intervention</Label>
                    <Input
                      id="intervention_type"
                      placeholder="ex: Vidange, freins..."
                      {...register("intervention_type")}
                    />
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Information principale *</Label>
                <Input
                  id="title"
                  placeholder="Décrivez brièvement cette information"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Cette information sert de base à notre analyse. Elle ne sera pas publiée telle quelle.
                </p>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <Label htmlFor="summary">Éléments de contexte *</Label>
                <Textarea
                  id="summary"
                  placeholder="Fournissez le contexte et les détails importants..."
                  rows={3}
                  {...register("summary")}
                />
                {errors.summary && (
                  <p className="text-sm text-destructive">{errors.summary.message}</p>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2">
                <Label htmlFor="details">Détails additionnels (optionnel)</Label>
                <Textarea
                  id="details"
                  placeholder="Ajoutez tout détail supplémentaire pertinent..."
                  rows={3}
                  {...register("details")}
                />
              </div>

              {/* Documents upload */}
              <div className="space-y-3">
                <Label>Documents justificatifs</Label>
                <div className="flex flex-wrap gap-2">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
                    >
                      <File className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[150px]">{doc.name}</span>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {documents.length < 5 && (
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:border-success/50 transition-colors">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Ajouter</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleDocumentUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Les documents sont privés et servent uniquement à valider vos informations.
                </p>
              </div>

              {/* Photos upload */}
              <div className="space-y-3">
                <Label>Photos (optionnel)</Label>
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-border"
                    >
                      <img
                        src={URL.createObjectURL(photo)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-destructive hover:bg-background"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 10 && (
                    <label className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border border-dashed border-border cursor-pointer hover:border-success/50 transition-colors">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Anonymous toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="anonymous" className="text-sm font-medium">
                    Contribution anonyme
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Votre nom ne sera pas affiché publiquement
                  </p>
                </div>
                <Switch
                  id="anonymous"
                  checked={watch("is_anonymous")}
                  onCheckedChange={(checked) => setValue("is_anonymous", checked)}
                />
              </div>

              {/* Educational banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">Vos informations sont protégées</p>
                    <p className="text-muted-foreground">
                      Vous transmettez des informations brutes. Elles sont analysées, anonymisées et reformulées automatiquement par VLINKS avant toute publication.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting || processingStatus !== 'idle'}
                className="w-full bg-success hover:bg-success/90"
              >
                {processingStatus === 'submitting' && (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                )}
                {processingStatus === 'processing' && (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                )}
                {processingStatus === 'idle' && !isSubmitting && (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Soumettre ma contribution
                  </>
                )}
                {isSubmitting && processingStatus === 'idle' && (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                )}
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
