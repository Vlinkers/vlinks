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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Image as ImageIcon,
  File,
  CheckCircle,
  Shield,
  User,
  Tag,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const contributionTypes = [
  {
    value: "photo_evidence",
    label: "Photos du véhicule",
    icon: Camera,
    description: "Photos détaillées du véhicule",
  },
  {
    value: "inspection_report",
    label: "Inspection mécanique",
    icon: FileSearch,
    description: "Résultat d'une inspection professionnelle",
  },
  {
    value: "vehicle_history",
    label: "Document / historique",
    icon: FileText,
    description: "Carfax, facture, rapport d'historique",
  },
  {
    value: "observation",
    label: "Observation lors d'une visite",
    icon: Eye,
    description: "Ce que vous avez constaté sur place",
  },
  {
    value: "mechanic_conversation",
    label: "Avis mécanicien",
    icon: Wrench,
    description: "Opinion d'un professionnel",
  },
  {
    value: "owner_exchange",
    label: "Échange avec vendeur",
    icon: MessageCircle,
    description: "Informations obtenues du vendeur",
  },
  {
    value: "purchase_decision",
    label: "Décision d'achat",
    icon: XCircle,
    description: "Pourquoi vous avez acheté ou renoncé",
  },
  {
    value: "ownership_change",
    label: "Changement de propriétaire",
    icon: XCircle,
    description: "Signaler que le véhicule a changé de propriétaire",
  },
  {
    value: "for_sale",
    label: "Mise en vente du véhicule",
    icon: Tag,
    description: "Signaler qu'un véhicule est actuellement ou récemment en vente",
  },
  {
    value: "price_change",
    label: "Modification du prix de vente",
    icon: Tag,
    description: "Signaler une modification du prix demandé pour un véhicule en vente",
  },
] as const;

const documentTypes = [
  { value: "facture", label: "Facture récente", description: "Facture d'entretien ou de réparation" },
  { value: "assurance", label: "Certificat d'assurance", description: "Document d'assurance actif" },
  { value: "carte_grise", label: "Carte grise (masquée)", description: "Carte grise avec informations personnelles masquées" },
  { value: "autre", label: "Autre document", description: "Tout document prouvant la propriété" },
];

const provinces = [
  "Québec",
  "Ontario",
  "Alberta",
  "Colombie-Britannique",
  "Manitoba",
  "Saskatchewan",
  "Nouveau-Brunswick",
  "Nouvelle-Écosse",
  "Île-du-Prince-Édouard",
  "Terre-Neuve-et-Labrador",
];

const months = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const holderTypes = [
  { value: "concessionnaire", label: "Concessionnaire" },
  { value: "depot_vente", label: "Dépôt-vente" },
  { value: "particulier", label: "Particulier" },
  { value: "inconnu", label: "Inconnu" },
];

// Types that show the holder field
const typesWithHolder = ["ownership_change", "observation", "for_sale"];
const typesWithDate = ["ownership_change", "for_sale", "price_change"];

const contributionSchema = z.object({
  contribution_type: z.enum([
    "inspection_report",
    "vehicle_history",
    "owner_exchange",
    "mechanic_conversation",
    "photo_evidence",
    "observation",
    "purchase_decision",
    "ownership_change",
    "for_sale",
    "price_change",
  ]),
  observation: z
    .string()
    .trim()
    .min(10, "Veuillez décrire votre observation (minimum 10 caractères)")
    .max(3000, "L'observation ne peut pas dépasser 3000 caractères"),
  context: z
    .string()
    .trim()
    .max(500, "Le contexte ne peut pas dépasser 500 caractères")
    .optional(),
  is_anonymous: z.boolean().default(false),
  mileage: z.string().optional(),
  province: z.string().optional(),
  holder_type: z.string().optional(),
  dealer_name: z.string().max(200).optional(),
  ownership_month: z.string().optional(),
  ownership_year: z.string().optional(),
  asking_price: z.string().optional(),
  old_price: z.string().optional(),
  listing_url: z.string().url("URL invalide").or(z.literal("")).optional(),
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
    },
  });

  const contributionType = watch("contribution_type");
  const holderType = watch("holder_type");

  // Check owner verification status on mount
  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (!isOwnerClaim || !open) return;

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

  const submitContribution = async (data: ContributionFormData, actualVinId: string, userId: string) => {
    // Get user profile for author label
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, public_id")
      .eq("user_id", userId)
      .maybeSingle();

    const authorLabel = data.is_anonymous ? "Anonyme" : (profile?.username || "Anonyme");
    const authorPublicId = data.is_anonymous ? null : (profile?.public_id || null);

    // Map new fields to DB columns: observation → title+summary, context → details
    const title = data.observation.substring(0, 200);
    const summary = data.observation;
    const details = data.context || null;

    // Parse mileage
    const mileage = data.mileage ? parseInt(data.mileage.replace(/\s/g, ''), 10) : null;
    const validMileage = mileage && !isNaN(mileage) ? mileage : null;

    // Build intervention_date from month/year if ownership_change or for_sale
    let interventionDate: string | null = null;
    if (typesWithDate.includes(data.contribution_type) && data.ownership_year) {
      const monthIndex = data.ownership_month ? months.indexOf(data.ownership_month) + 1 : 1;
      const monthStr = String(monthIndex).padStart(2, '0');
      interventionDate = `${data.ownership_year}-${monthStr}-01`;
    }

    // Parse asking price
    const askingPrice = data.asking_price ? parseInt(data.asking_price.replace(/\s/g, ''), 10) : null;
    const validAskingPrice = askingPrice && !isNaN(askingPrice) ? askingPrice : null;
    const oldPriceVal = data.old_price ? parseInt(data.old_price.replace(/\s/g, ''), 10) : null;
    const validOldPrice = oldPriceVal && !isNaN(oldPriceVal) ? oldPriceVal : null;
    const listingUrl = data.listing_url && data.listing_url.trim() ? data.listing_url.trim() : null;

    // Create raw contribution for audit trail
    const { error: rawError } = await supabase
      .from("raw_contributions")
      .insert({
        vin_id: actualVinId,
        user_id: userId,
        contribution_type: data.contribution_type,
        title,
        summary,
        details,
        is_anonymous: data.is_anonymous,
        is_owner_contribution: isOwnerClaim,
        mileage_at_intervention: validMileage,
        intervention_date: interventionDate,
        province: data.province || null,
        holder_type: data.holder_type || null,
        dealer_name: data.holder_type === "concessionnaire" ? (data.dealer_name || null) : null,
        asking_price: validAskingPrice,
        listing_url: listingUrl,
      } as any);

    if (rawError) throw rawError;

    // Also create legacy contribution
    const { data: contribution, error: contributionError } = await supabase
      .from("vin_contributions")
      .insert({
        vin_id: actualVinId,
        user_id: userId,
        contribution_type: data.contribution_type,
        title,
        summary,
        details,
        is_anonymous: data.is_anonymous,
      })
      .select()
      .single();

    if (contributionError) throw contributionError;

    // Insert to public_contributions with status pending
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
        status: "pending",
        title,
        summary,
        details,
        mileage_at_intervention: validMileage,
        intervention_date: interventionDate,
        province: data.province || null,
        holder_type: data.holder_type || null,
        dealer_name: data.holder_type === "concessionnaire" ? (data.dealer_name || null) : null,
        asking_price: validAskingPrice,
        listing_url: listingUrl,
      } as any);

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

    toast({
      title: "Contribution soumise",
      description: "Votre contribution sera examinée et publiée après validation par VLINKS.",
    });

    // Notify VIN followers (fire and forget)
    supabase.functions.invoke('notify-vin-followers', {
      body: { vin, contribution_type: data.contribution_type },
    }).catch(err => console.error('Notification error:', err));

    // Reset form
    reset();
    setDocuments([]);
    setPhotos([]);
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

      await submitContribution(data, actualVinId, user.id);

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
        toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
        return;
      }

      let actualVinId = vinId;
      if (!actualVinId) {
        const { data: existingVin } = await supabase.from("vins").select("id").eq("vin", vin).maybeSingle();
        if (existingVin) {
          actualVinId = existingVin.id;
        } else {
          const { data: newVin, error: vinError } = await supabase.from("vins").insert({ vin }).select("id").single();
          if (vinError) throw vinError;
          actualVinId = newVin.id;
        }
      }

      const filePath = `${user.id}/${actualVinId}/${Date.now()}_${verificationDocument.name}`;
      const { error: uploadError } = await supabase.storage.from("owner-verification-docs").upload(filePath, verificationDocument);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("owner_verifications").insert({
        user_id: user.id,
        vin_id: actualVinId,
        document_path: filePath,
        document_type: verificationDocumentType,
        verification_status: "pending",
      });

      if (insertError) {
        if (insertError.code === "23505") {
          toast({ title: "Demande existante", description: "Une demande de vérification existe déjà pour ce véhicule", variant: "destructive" });
          return;
        }
        throw insertError;
      }

      setOwnerVerificationStatus('pending');

      if (pendingContributionData) {
        await submitContribution(pendingContributionData, actualVinId, user.id);
      }

      toast({ title: "Contribution et vérification envoyées", description: "Votre statut de propriétaire sera vérifié sous peu." });

    } catch (error) {
      console.error("Error submitting verification:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue lors de l'envoi", variant: "destructive" });
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
        const { data: existingVin } = await supabase.from("vins").select("id").eq("vin", vin).maybeSingle();
        if (existingVin) {
          actualVinId = existingVin.id;
        } else {
          const { data: newVin, error: vinError } = await supabase.from("vins").insert({ vin }).select("id").single();
          if (vinError) throw vinError;
          actualVinId = newVin.id;
        }
      }

      await submitContribution(pendingContributionData, actualVinId, user.id);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate year options (current year down to 1980)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1979 }, (_, i) => String(currentYear - i));

  const showHolderField = typesWithHolder.includes(contributionType);

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
                <p className="text-sm font-medium text-foreground">Document confidentiel</p>
                <p className="text-xs text-muted-foreground mt-1">
                  🔒 Ce document n'est jamais publié. Il sert uniquement à valider votre statut de propriétaire.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Type de document</Label>
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
                    <p className={`font-medium text-sm ${verificationDocumentType === type.value ? "text-success" : "text-foreground"}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Document de vérification</Label>
              {!verificationDocument ? (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-success/50 transition-colors bg-muted/20">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Cliquez pour téléverser</span>
                  <span className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 10 Mo)</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleVerificationDocumentUpload} className="hidden" />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{verificationDocument.name}</p>
                      <p className="text-xs text-muted-foreground">{(verificationDocument.size / 1024).toFixed(1)} Ko</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setVerificationDocument(null)}>
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi en cours...</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" />Valider mon statut de propriétaire</>
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={skipVerification} disabled={isSubmitting} className="text-muted-foreground">
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-strong">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            {isOwnerClaim && <User className="w-6 h-6 text-success" />}
            Contribuer
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            VIN: <span className="font-mono">{vin}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Explanatory message */}
        <div className="bg-muted/30 border border-border rounded-xl p-4">
          <p className="text-sm text-foreground">
            Décrivez simplement ce que vous avez observé.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            VLINKS vérifiera et publiera l'information si elle est pertinente.
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <span>⏱️</span>
            <span>Moins d'1 minute · Contribution anonyme possible</span>
          </p>
        </div>

        {/* Owner claim badge */}
        {isOwnerClaim && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-3 flex items-center gap-2">
            <User className="w-4 h-4 text-success" />
            <p className="text-sm text-foreground font-medium">Vous contribuez en tant que propriétaire</p>
            {ownerVerificationStatus === 'verified' && (
              <Badge variant="verified" className="ml-auto">
                <CheckCircle className="w-3 h-3 mr-1" />Vérifié
              </Badge>
            )}
            {ownerVerificationStatus === 'pending' && (
              <Badge variant="info" className="ml-auto">
                <Shield className="w-3 h-3 mr-1" />En cours
              </Badge>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* 1. Contribution Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Type de contribution *</Label>
            <div className="grid grid-cols-1 gap-2">
              {contributionTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = contributionType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setValue("contribution_type", type.value)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/50 bg-muted/20"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`font-medium text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.contribution_type && (
              <p className="text-sm text-destructive">Veuillez sélectionner un type</p>
            )}
          </div>

          {/* Date selector for ownership_change and for_sale */}
          {typesWithDate.includes(contributionType) && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {contributionType === "ownership_change" ? "Date du changement de propriétaire" : "Date de mise en vente"}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Select onValueChange={(v) => setValue("ownership_month", v)} value={watch("ownership_month") || ""}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => setValue("ownership_year", v)} value={watch("ownership_year") || ""}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 2. Observation principale */}
          <div className="space-y-2">
            <Label htmlFor="observation" className="text-sm font-semibold">
              {contributionType === "ownership_change"
                ? "Vendeur ou ancien propriétaire *"
                : contributionType === "for_sale"
                ? "Description de la mise en vente *"
                : "Qu'avez-vous observé ou appris concernant ce véhicule ? *"}
            </Label>
            <Textarea
              id="observation"
              {...register("observation")}
              placeholder={
                contributionType === "ownership_change"
                  ? "Ex: Uslynn Auto, Concessionnaire Volvo Montréal, Particulier..."
                  : contributionType === "for_sale"
                  ? "Ex: En vente chez Uslynn Auto, véhicule affiché sur AutoHebdo..."
                  : "Ex: Jantes avant abîmées côté passager, traces de rouille sous le châssis, le vendeur mentionne un changement de courroie..."
              }
              rows={contributionType === "ownership_change" || contributionType === "for_sale" ? 3 : 4}
              className="bg-muted/30 resize-none"
            />
            {errors.observation && (
              <p className="text-sm text-destructive">{errors.observation.message}</p>
            )}
          </div>

          {/* Holder type field (for ownership_change and observation) */}
          {showHolderField && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Qui détient actuellement le véhicule ?
                <span className="text-muted-foreground font-normal ml-1">— optionnel</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {holderTypes.map((ht) => {
                  const isSelected = holderType === ht.value;
                  return (
                    <button
                      key={ht.value}
                      type="button"
                      onClick={() => setValue("holder_type", isSelected ? "" : ht.value)}
                      className={`p-2.5 rounded-lg border text-sm text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:border-muted-foreground/50 bg-muted/20 text-foreground"
                      }`}
                    >
                      {ht.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dealer name (only if holder_type === concessionnaire) */}
          {showHolderField && holderType === "concessionnaire" && (
            <div className="space-y-2">
              <Label htmlFor="dealer_name" className="text-sm font-semibold">
                Nom du concessionnaire
                <span className="text-muted-foreground font-normal ml-1">— optionnel</span>
              </Label>
              <Input
                id="dealer_name"
                {...register("dealer_name")}
                placeholder="Ex: Concessionnaire Volvo Montréal"
                className="bg-muted/30"
              />
            </div>
          )}

          {/* Mileage */}
          <div className="space-y-2">
            <Label htmlFor="mileage" className="text-sm font-semibold">
              Kilométrage du véhicule
              <span className="text-muted-foreground font-normal ml-1">— optionnel</span>
            </Label>
            <Input
              id="mileage"
              {...register("mileage")}
              placeholder="Ex: 124500"
              type="number"
              min="0"
              max="9999999"
              className="bg-muted/30"
            />
          </div>

          {/* Province */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Province
              <span className="text-muted-foreground font-normal ml-1">— optionnel</span>
            </Label>
            <Select onValueChange={(v) => setValue("province", v)} value={watch("province") || ""}>
              <SelectTrigger className="bg-muted/30">
                <SelectValue placeholder="Sélectionner une province" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* For sale specific: Price and listing URL */}
          {contributionType === "for_sale" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="asking_price" className="text-sm font-semibold">
                  Prix demandé ($)
                  <span className="text-muted-foreground font-normal ml-1">— optionnel</span>
                </Label>
                <Input
                  id="asking_price"
                  {...register("asking_price")}
                  placeholder="Ex: 36900"
                  type="number"
                  min="0"
                  max="99999999"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listing_url" className="text-sm font-semibold">
                  Lien vers l'annonce
                  <span className="text-muted-foreground font-normal ml-1">— optionnel</span>
                </Label>
                <Input
                  id="listing_url"
                  {...register("listing_url")}
                  placeholder="Ex: https://www.autohebdo.net/..."
                  type="url"
                  className="bg-muted/30"
                />
                {errors.listing_url && (
                  <p className="text-sm text-destructive">{errors.listing_url.message}</p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <Camera className="w-4 h-4" />
              Photos ({photos.length}/10)
              <span className="text-muted-foreground font-normal">— optionnel</span>
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
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 10 && (
                <label className="aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                  <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Ajouter</span>
                  <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" multiple />
                </label>
              )}
            </div>
          </div>

          {/* 4. Documents (optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <File className="w-4 h-4" />
              Documents ({documents.length}/5)
              <span className="text-muted-foreground font-normal">— optionnel</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm truncate max-w-[150px]">{doc.name}</span>
                  <button type="button" onClick={() => removeDocument(index)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {documents.length < 5 && (
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Ajouter</span>
                  <input type="file" className="hidden" onChange={handleDocumentUpload} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" multiple />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              🔒 Les documents ne sont jamais publiés. Ils servent uniquement de preuves internes.
            </p>
          </div>

          {/* 5. Context (optional) */}
          <div className="space-y-2">
            <Label htmlFor="context" className="text-sm font-semibold">
              {contributionType === "ownership_change" || contributionType === "for_sale"
                ? "Contexte ou information complémentaire"
                : "Dans quel contexte avez-vous obtenu cette information ?"}
              <span className="text-muted-foreground font-normal ml-1">— optionnel</span>
            </Label>
            <Input
              id="context"
              {...register("context")}
              placeholder={
                contributionType === "ownership_change"
                  ? "Ex: Le véhicule était en vente chez Uslynn Auto et a été vendu en février 2026."
                  : contributionType === "for_sale"
                  ? "Ex: Véhicule affiché depuis janvier 2026 chez le concessionnaire."
                  : "Ex: visite du véhicule, inspection mécanique, discussion avec vendeur..."
              }
              className="bg-muted/30"
            />
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <div>
              <Label htmlFor="anonymous" className="font-medium text-sm">Contribution anonyme</Label>
              <p className="text-xs text-muted-foreground">Votre nom ne sera pas affiché</p>
            </div>
            <Switch
              id="anonymous"
              checked={watch("is_anonymous")}
              onCheckedChange={(checked) => setValue("is_anonymous", checked)}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="hero"
              disabled={isSubmitting}
              className={`flex-1 ${isOwnerClaim ? 'bg-success hover:bg-success/90' : ''}`}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</>
              ) : (
                "Envoyer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
