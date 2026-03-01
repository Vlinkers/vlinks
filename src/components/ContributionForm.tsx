import { useState, useCallback, useEffect } from "react";
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
  Shield,
  User,
  Loader2,
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

const documentTypes = [
  { value: "facture", label: "Facture récente", description: "Facture d'entretien ou de réparation" },
  { value: "assurance", label: "Certificat d'assurance", description: "Document d'assurance actif" },
  { value: "carte_grise", label: "Carte grise (masquée)", description: "Carte grise avec informations personnelles masquées" },
  { value: "autre", label: "Autre document", description: "Tout document prouvant la propriété" },
];

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
  vinId: string | null;
  vin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  isOwnerClaim?: boolean;
}

type FormStep = 'contribution' | 'verification';

export function ContributionForm({
  vinId,
  vin,
  open,
  onOpenChange,
  onSuccess,
  isOwnerClaim = false,
}: ContributionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'submitting' | 'processing' | 'done' | 'error'>('idle');
  
  // Owner verification state
  const [currentStep, setCurrentStep] = useState<FormStep>('contribution');
  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState<'none' | 'pending' | 'verified'>('none');
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);
  const [verificationDocumentType, setVerificationDocumentType] = useState<string>("");
  const [pendingContributionData, setPendingContributionData] = useState<ContributionFormData | null>(null);

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

  // Check owner verification status on mount
  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (!isOwnerClaim || !open) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get VIN ID if exists
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
  }, [isOwnerClaim, open, vinId, vin]);

  // Reset step when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep('contribution');
      setVerificationDocument(null);
      setVerificationDocumentType("");
      setPendingContributionData(null);
    }
  }, [open]);

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

  const submitContribution = async (data: ContributionFormData, actualVinId: string, userId: string) => {
    setProcessingStatus('submitting');

    // Get user profile for author label
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, public_id")
      .eq("user_id", userId)
      .maybeSingle();

    const authorLabel = data.is_anonymous ? "Anonyme" : (profile?.username || "Anonyme");
    const authorPublicId = data.is_anonymous ? null : (profile?.public_id || null);

    // Create raw contribution for audit trail
    const { data: rawContribution, error: rawError } = await supabase
      .from("raw_contributions")
      .insert({
        vin_id: actualVinId,
        user_id: userId,
        contribution_type: data.contribution_type,
        title: data.title,
        summary: data.summary,
        details: data.details || null,
        is_anonymous: data.is_anonymous,
        is_owner_contribution: isOwnerClaim,
      })
      .select()
      .single();

    if (rawError) throw rawError;

    // Also create legacy contribution
    const { data: contribution, error: contributionError } = await supabase
      .from("vin_contributions")
      .insert({
        vin_id: actualVinId,
        user_id: userId,
        contribution_type: data.contribution_type,
        title: data.title,
        summary: data.summary,
        details: data.details || null,
        is_anonymous: data.is_anonymous,
      })
      .select()
      .single();

    if (contributionError) throw contributionError;

    // Publish directly to public_contributions
    const { error: pubError } = await supabase
      .from("public_contributions")
      .insert({
        user_id: userId,
        vin_id: actualVinId,
        contribution_type: data.contribution_type,
        is_anonymous: data.is_anonymous,
        is_owner_contribution: isOwnerClaim,
        author_label: authorLabel,
        author_public_id: authorPublicId,
      });

    if (pubError) {
      console.error("Error publishing contribution:", pubError);
    }

    // Upload documents
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

    // Upload photos
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

    // Add tags
    for (const tag of tags) {
      await supabase.from("contribution_tags").insert({
        contribution_id: contribution.id,
        tag,
      });
    }

    setProcessingStatus('done');
    toast({
      title: "Contribution publiée",
      description: "Votre contribution a été publiée avec succès.",
    });

    // Reset form
    reset();
    setDocuments([]);
    setPhotos([]);
    setTags([]);
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

      // Get or create VIN record
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

      // If owner claim and not yet verified, show verification step
      if (isOwnerClaim && ownerVerificationStatus === 'none') {
        setPendingContributionData(data);
        setCurrentStep('verification');
        setIsSubmitting(false);
        return;
      }

      // Otherwise, submit directly
      await submitContribution(data, actualVinId, user.id);

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

      // Get or create VIN record
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

      // Upload verification document
      const filePath = `${user.id}/${actualVinId}/${Date.now()}_${verificationDocument.name}`;
      const { error: uploadError } = await supabase.storage
        .from("owner-verification-docs")
        .upload(filePath, verificationDocument);

      if (uploadError) throw uploadError;

      // Create verification record
      const { error: insertError } = await supabase
        .from("owner_verifications")
        .insert({
          user_id: user.id,
          vin_id: actualVinId,
          document_path: filePath,
          document_type: verificationDocumentType,
          verification_status: "pending",
        });

      if (insertError) {
        if (insertError.code === "23505") {
          toast({
            title: "Demande existante",
            description: "Une demande de vérification existe déjà pour ce véhicule",
            variant: "destructive",
          });
          return;
        }
        throw insertError;
      }

      setOwnerVerificationStatus('pending');

      // Now submit the contribution
      if (pendingContributionData) {
        await submitContribution(pendingContributionData, actualVinId, user.id);
      }

      toast({
        title: "Contribution et vérification envoyées",
        description: "Votre statut de propriétaire sera vérifié sous peu.",
      });

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

  const skipVerification = async () => {
    if (!pendingContributionData) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      await submitContribution(pendingContributionData, actualVinId, user.id);

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = contributionTypes.find(
    (t) => t.value === contributionType
  );

  // Verification step UI
  if (currentStep === 'verification') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-strong">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-success" />
              Vérification de propriété
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              VIN: <span className="font-mono">{vin}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="bg-success/10 border border-success/30 rounded-xl p-4 space-y-2">
            <p className="text-sm text-foreground font-medium">
              Vous avez indiqué être propriétaire de ce véhicule.
            </p>
            <p className="text-sm text-muted-foreground">
              Pour valider votre statut, téléversez un document prouvant votre propriété. 
              Cette vérification n'est demandée qu'une seule fois.
            </p>
          </div>

          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Document confidentiel
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  🔒 Ce document n'est jamais publié. Il sert uniquement à valider votre statut de propriétaire.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Document Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Type de document
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {documentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setVerificationDocumentType(type.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      verificationDocumentType === type.value
                        ? "border-success bg-success/10"
                        : "border-border hover:border-muted-foreground/50 bg-muted/30"
                    }`}
                  >
                    <p className={`font-medium text-sm ${
                      verificationDocumentType === type.value ? "text-success" : "text-foreground"
                    }`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Upload */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Document de vérification
              </Label>
              
              {!verificationDocument ? (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-success/50 transition-colors bg-muted/20">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Cliquez pour téléverser
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
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {verificationDocument.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(verificationDocument.size / 1024).toFixed(1)} Ko
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setVerificationDocument(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleVerificationSubmit}
              variant="hero"
              className="w-full bg-success hover:bg-success/90"
              disabled={isSubmitting || !verificationDocument || !verificationDocumentType}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Valider mon statut de propriétaire
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={skipVerification}
              disabled={isSubmitting}
              className="text-muted-foreground"
            >
              Continuer sans vérification
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            La vérification vous identifie comme propriétaire et renforce la crédibilité de vos contributions.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            {isOwnerClaim && <User className="w-6 h-6 text-success" />}
            Ajouter un maillon d'information
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            VIN: <span className="font-mono">{vin}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Owner claim badge */}
        {isOwnerClaim && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-success" />
              <p className="text-sm text-foreground font-medium">
                Vous contribuez en tant que propriétaire
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Vos informations sont analysées et reformulées automatiquement par VLINKS avant toute publication.
            </p>
            {ownerVerificationStatus === 'verified' && (
              <Badge variant="verified" className="mt-2">
                <CheckCircle className="w-3 h-3 mr-1" />
                Propriétaire vérifié
              </Badge>
            )}
            {ownerVerificationStatus === 'pending' && (
              <Badge variant="info" className="mt-2">
                <Shield className="w-3 h-3 mr-1" />
                Vérification en cours
              </Badge>
            )}
          </div>
        )}

        {/* Encadré pédagogique principal */}
        {!isOwnerClaim && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-3">
            <p className="text-sm text-foreground font-medium">
              Vous ajoutez un maillon à la chaîne d'information de ce véhicule.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>
                <span>Vos contributions ne sont pas publiées telles quelles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>
                <span>VLINKS revoit, assemble et reformule les maillons</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>
                <span>Les documents bruts restent privés</span>
              </li>
            </ul>
          </div>
        )}

        {/* Micro-indicateur du processus */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isOwnerClaim ? 'bg-success/60' : 'bg-primary/60'}`}></span>
            Transmission
          </span>
          <span className="text-muted-foreground/50">→</span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isOwnerClaim ? 'bg-success/40' : 'bg-primary/40'}`}></span>
            Analyse VLINKS
          </span>
          <span className="text-muted-foreground/50">→</span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isOwnerClaim ? 'bg-success/40' : 'bg-primary/40'}`}></span>
            Assemblage
          </span>
          <span className="text-muted-foreground/50">→</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success/40"></span>
            Publication
          </span>
        </div>

        {/* Note d'encouragement */}
        <div className="bg-muted/30 border border-border rounded-xl p-4">
          <p className="text-sm text-foreground">
            Chaque maillon compte. Information partielle ou complète, positive ou négative — tout enrichit la vision collective.
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <span>⏱️</span>
            <span>2–5 minutes · Contribution anonyme possible</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Contribution Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Quelle(s) information(s) apportez-vous ?
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contributionTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = contributionType === type.value;
                const accentColor = isOwnerClaim ? 'success' : 'primary';
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setValue("contribution_type", type.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `border-${accentColor} bg-${accentColor}/10`
                        : "border-border hover:border-muted-foreground/50 bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? `bg-${accentColor}/20` : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            isSelected ? `text-${accentColor}` : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`font-medium ${
                            isSelected ? `text-${accentColor}` : "text-foreground"
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
            <p className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
              <span>🎁</span>
              <span>Cette contribution peut vous rapporter des crédits</span>
            </p>
          </div>

          {/* Information principale */}
          <div className="space-y-2">
            <Label htmlFor="title">Information principale *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Ex: Problème de rouille, Historique d'entretien complet, État général du véhicule..."
              className="bg-muted/30"
            />
            <p className="text-xs text-muted-foreground">
              🔒 Ce champ n'est pas visible publiquement — Il aide VLINKS à comprendre votre contribution.
            </p>
            {errors.title && (
              <p className="text-sm text-danger">{errors.title.message}</p>
            )}
          </div>

          {/* Éléments de contexte */}
          <div className="space-y-2">
            <Label htmlFor="summary">Éléments de contexte *</Label>
            <Textarea
              id="summary"
              {...register("summary")}
              placeholder="Décrivez librement ce que vous savez ou avez observé. Écrivez naturellement, sans vous soucier de la forme."
              rows={3}
              className="bg-muted/30 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              🔒 Ce champ n'est pas visible publiquement — VLINKS reformule automatiquement vos informations.
            </p>
            {errors.summary && (
              <p className="text-sm text-danger">{errors.summary.message}</p>
            )}
          </div>

          {/* Détails additionnels */}
          <div className="space-y-2">
            <Label htmlFor="details">Détails additionnels (optionnel)</Label>
            <Textarea
              id="details"
              {...register("details")}
              placeholder="Ajoutez tout ce qui pourrait être utile : circonstances, échanges avec le vendeur, impressions..."
              rows={4}
              className="bg-muted/30 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              🔒 Ce champ n'est pas visible publiquement — Ces informations enrichissent l'analyse.
            </p>
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
              Documents justificatifs ({documents.length}/5)
            </Label>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
                >
                  <FileText className={`w-4 h-4 ${isOwnerClaim ? 'text-success' : 'text-primary'}`} />
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
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:border-${isOwnerClaim ? 'success' : 'primary'} cursor-pointer transition-colors`}>
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
              🔒 Les documents originaux ne sont jamais publiés. Seuls des résumés techniques anonymisés peuvent l'être.
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
                <label className={`aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-border hover:border-${isOwnerClaim ? 'success' : 'primary'} cursor-pointer transition-colors`}>
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

          {/* Processing Status */}
          {processingStatus === 'processing' && (
            <div className={`flex items-center justify-center gap-3 p-4 rounded-lg ${isOwnerClaim ? 'bg-success/10 border border-success/20' : 'bg-primary/10 border border-primary/20'}`}>
              <div className={`w-4 h-4 border-2 ${isOwnerClaim ? 'border-success' : 'border-primary'} border-t-transparent rounded-full animate-spin`} />
              <div className="text-sm">
                <span className={`${isOwnerClaim ? 'text-success' : 'text-primary'} font-medium`}>Analyse VLINKS en cours</span>
                <span className="text-muted-foreground"> → Reformulation → Publication contrôlée</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="hero"
              disabled={isSubmitting || processingStatus === 'processing'}
              className={`flex-1 ${isOwnerClaim ? 'bg-success hover:bg-success/90' : ''}`}
            >
              {processingStatus === 'submitting' && "Ajout en cours..."}
              {processingStatus === 'processing' && "Analyse en cours..."}
              {processingStatus === 'idle' && "Ajouter ce maillon à la chaîne"}
              {processingStatus === 'done' && "Ajouter ce maillon à la chaîne"}
              {processingStatus === 'error' && "Réessayer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
