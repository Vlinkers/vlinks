import { useState, useCallback, useEffect, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Upload,
  X,
  Image as ImageIcon,
  File,
  CheckCircle,
  Shield,
  User,
  Loader2,
  Camera,
  ArrowLeft,
  ArrowRight,
  Eye,
  FileSearch,
  MessageCircle,
  CalendarDays,
  ShoppingCart,
  Wrench,
  Building2,
  UserCheck,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Constants ───────────────────────────────────────────────────────

const provinces = [
  "Québec", "Ontario", "Alberta", "Colombie-Britannique", "Manitoba",
  "Saskatchewan", "Nouveau-Brunswick", "Nouvelle-Écosse",
  "Île-du-Prince-Édouard", "Terre-Neuve-et-Labrador",
];

const months = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const documentTypes = [
  { value: "facture", label: "Facture récente", description: "Facture d'entretien ou de réparation" },
  { value: "assurance", label: "Certificat d'assurance", description: "Document d'assurance actif" },
  { value: "carte_grise", label: "Carte grise (masquée)", description: "Carte grise avec informations personnelles masquées" },
  { value: "autre", label: "Autre document", description: "Tout document prouvant la propriété" },
];

// ─── Types ───────────────────────────────────────────────────────────

type ContributorProfile = "buyer" | "current_owner" | "former_owner" | "professional" | "other";
type InfoCategory = "observation" | "document" | "exchange" | "event";
type DocumentSubType = "inspection_report" | "invoice" | "vehicle_history" | "other_document";
type ExchangeSubType = "seller" | "mechanic" | "dealer" | "other_person";
type EventSubType = "ownership_change" | "for_sale" | "price_change" | "current_status";
type HolderType = "concessionnaire" | "depot_vente" | "particulier" | "inconnu";
type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  // Step 1
  profile: ContributorProfile | null;
  // Step 2
  category: InfoCategory | null;
  // Step 3 sub-selections
  documentSubType: DocumentSubType | null;
  exchangeSubType: ExchangeSubType | null;
  eventSubType: EventSubType | null;
  // Step 3 fields
  dateMonth: string;
  dateYear: string;
  mileage: string;
  description: string;
  holderType: HolderType | "";
  dealerName: string;
  province: string;
  askingPrice: string;
  oldPrice: string;
  listingUrl: string;
  // Step 4
  evidenceType: "photo" | "document" | "none" | null;
  // General
  isAnonymous: boolean;
}

const initialWizardState: WizardState = {
  profile: null,
  category: null,
  documentSubType: null,
  exchangeSubType: null,
  eventSubType: null,
  dateMonth: "",
  dateYear: "",
  mileage: "",
  description: "",
  holderType: "",
  dealerName: "",
  province: "",
  askingPrice: "",
  oldPrice: "",
  listingUrl: "",
  evidenceType: null,
  isAnonymous: false,
};

// ─── Draft storage key ───────────────────────────────────────────────

const getDraftKey = (vin: string) => `vlinks_contribution_draft_${vin}`;

// ─── Mapping wizard to DB contribution_type ──────────────────────────

function resolveContributionType(state: WizardState): string {
  const { category, documentSubType, exchangeSubType, eventSubType } = state;
  if (category === "observation") return "observation";
  if (category === "document") {
    if (documentSubType === "inspection_report") return "inspection_report";
    if (documentSubType === "invoice") return "vehicle_history";
    if (documentSubType === "vehicle_history") return "vehicle_history";
    return "vehicle_history";
  }
  if (category === "exchange") {
    if (exchangeSubType === "mechanic") return "mechanic_conversation";
    return "owner_exchange";
  }
  if (category === "event") {
    if (eventSubType === "ownership_change") return "ownership_change";
    if (eventSubType === "for_sale") return "for_sale";
    if (eventSubType === "price_change") return "price_change";
    if (eventSubType === "current_status") return "observation";
    return "observation";
  }
  return "observation";
}

// ─── Props ──────────────────────────────────────────────────────────

interface ContributionFormProps {
  vinId: string | null;
  vin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  isOwnerClaim?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

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
  const [step, setStep] = useState<WizardStep>(1);
  const [w, setW] = useState<WizardState>({ ...initialWizardState });
  const [hasDraft, setHasDraft] = useState(false);

  // Owner verification state
  const [showVerification, setShowVerification] = useState(false);
  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState<"none" | "pending" | "verified">("none");
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);
  const [verificationDocumentType, setVerificationDocumentType] = useState("");

  // Check owner verification status
  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (!isOwnerClaim || !open) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let checkVinId = vinId;
      if (!checkVinId) {
        const { data: existingVin } = await supabase.from("vins").select("id").eq("vin", vin).maybeSingle();
        if (existingVin) checkVinId = existingVin.id;
      }
      if (checkVinId) {
        const { data: verification } = await supabase
          .from("owner_verifications")
          .select("verification_status")
          .eq("user_id", user.id)
          .eq("vin_id", checkVinId)
          .maybeSingle();
        if (verification) {
          setOwnerVerificationStatus(
            verification.verification_status === "verified" ? "verified" : verification.verification_status === "pending" ? "pending" : "none"
          );
        }
      }
    };
    checkOwnerStatus();
  }, [isOwnerClaim, open, vinId, vin]);

  // Load draft on open
  useEffect(() => {
    if (open && vin) {
      const draftKey = getDraftKey(vin);
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.w && parsed.step) {
            setW(parsed.w);
            setStep(parsed.step);
            setHasDraft(true);
          }
        } catch (e) {
          console.error("Failed to parse draft:", e);
        }
      }
    }
  }, [open, vin]);

  // Save draft on change
  useEffect(() => {
    if (open && vin) {
      const draftKey = getDraftKey(vin);
      // Only save if user has made some progress
      if (w.profile || w.category || w.description) {
        localStorage.setItem(draftKey, JSON.stringify({ w, step }));
      }
    }
  }, [open, vin, w, step]);

  // Clear draft function
  const clearDraft = useCallback(() => {
    if (vin) {
      localStorage.removeItem(getDraftKey(vin));
    }
    setStep(1);
    setW({ ...initialWizardState });
    setDocuments([]);
    setPhotos([]);
    setHasDraft(false);
  }, [vin]);

  // Reset on close (but don't clear draft)
  useEffect(() => {
    if (!open) {
      setShowVerification(false);
      setVerificationDocument(null);
      setVerificationDocumentType("");
    }
  }, [open]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1979 }, (_, i) => String(currentYear - i));

  // ─── Helpers ─────────────────────────────────────────────────────

  const updateW = useCallback((partial: Partial<WizardState>) => {
    setW((prev) => ({ ...prev, ...partial }));
  }, []);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      setPhotos((prev) => [...prev, ...newFiles].slice(0, 10));
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }, []);

  const handleDocumentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).slice(0, 5 - documents.length);
      setDocuments((prev) => [...prev, ...newFiles]);
    }
    e.target.value = "";
  }, [documents.length]);

  const handleVerificationDocumentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      if (files[0].size > 10 * 1024 * 1024) {
        toast({ title: "Fichier trop volumineux", description: "Max 10 Mo", variant: "destructive" });
        return;
      }
      setVerificationDocument(files[0]);
    }
  }, [toast]);

  // ─── Submission ──────────────────────────────────────────────────

  const submitContribution = async (actualVinId: string, userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, public_id")
      .eq("user_id", userId)
      .maybeSingle();

    const authorLabel = w.isAnonymous ? "Anonyme" : (profile?.username || "Anonyme");
    const authorPublicId = w.isAnonymous ? null : (profile?.public_id || null);
    const contributionType = resolveContributionType(w);

    const title = w.description.substring(0, 200);
    const summary = w.description;
    const details = null;

    const mileage = w.mileage ? parseInt(w.mileage.replace(/\s/g, ""), 10) : null;
    const validMileage = mileage && !isNaN(mileage) ? mileage : null;

    let interventionDate: string | null = null;
    if (w.dateYear) {
      const monthIndex = w.dateMonth ? months.indexOf(w.dateMonth) + 1 : 1;
      const monthStr = String(monthIndex).padStart(2, "0");
      interventionDate = `${w.dateYear}-${monthStr}-01`;
    }

    const askingPrice = w.askingPrice ? parseInt(w.askingPrice.replace(/\s/g, ""), 10) : null;
    const validAskingPrice = askingPrice && !isNaN(askingPrice) ? askingPrice : null;
    const oldPriceVal = w.oldPrice ? parseInt(w.oldPrice.replace(/\s/g, ""), 10) : null;
    const validOldPrice = oldPriceVal && !isNaN(oldPriceVal) ? oldPriceVal : null;
    const listingUrl = w.listingUrl?.trim() || null;

    const holderType = w.holderType || null;
    const dealerName = w.holderType === "concessionnaire" ? (w.dealerName || null) : null;
    const province = w.province || null;

    const { error: rawError } = await supabase.from("raw_contributions").insert({
      vin_id: actualVinId, user_id: userId, contribution_type: contributionType,
      title, summary, details, is_anonymous: w.isAnonymous, is_owner_contribution: isOwnerClaim,
      mileage_at_intervention: validMileage, intervention_date: interventionDate,
      province, holder_type: holderType, dealer_name: dealerName,
      asking_price: validAskingPrice, old_price: validOldPrice, listing_url: listingUrl,
    } as any);
    if (rawError) throw rawError;

    const { data: contribution, error: contributionError } = await supabase
      .from("vin_contributions")
      .insert({
        vin_id: actualVinId, user_id: userId, contribution_type: contributionType as any,
        title, summary, details, is_anonymous: w.isAnonymous,
      })
      .select()
      .single();
    if (contributionError) throw contributionError;

    await supabase.from("public_contributions").insert({
      user_id: userId, vin_id: actualVinId, contribution_type: contributionType,
      is_anonymous: w.isAnonymous, is_owner_contribution: isOwnerClaim,
      author_label: authorLabel, author_public_id: authorPublicId, status: "pending",
      title, summary, details,
      mileage_at_intervention: validMileage, intervention_date: interventionDate,
      province, holder_type: holderType, dealer_name: dealerName,
      asking_price: validAskingPrice, old_price: validOldPrice, listing_url: listingUrl,
    } as any);

    // Upload documents
    const uploadPromises: Promise<void>[] = [];
    
    for (const doc of documents) {
      const filePath = `${userId}/${contribution.id}/${Date.now()}_${doc.name}`;
      uploadPromises.push(
        supabase.storage.from("vin-documents").upload(filePath, doc).then(async ({ error: uploadError }) => {
          if (!uploadError) {
            await supabase.from("contribution_documents").insert({
              contribution_id: contribution.id, file_name: doc.name, file_path: filePath,
              file_type: doc.type, file_size: doc.size,
            });
          } else {
            console.error("Document upload error:", uploadError);
          }
        })
      );
    }

    // Upload photos
    for (const photo of photos) {
      const filePath = `${userId}/${contribution.id}/${Date.now()}_${photo.name}`;
      uploadPromises.push(
        supabase.storage.from("vin-photos").upload(filePath, photo).then(async ({ error: uploadError }) => {
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("vin-photos").getPublicUrl(filePath);
            await supabase.from("contribution_photos").insert({
              contribution_id: contribution.id, file_name: photo.name, file_path: urlData.publicUrl,
            });
          } else {
            console.error("Photo upload error:", uploadError);
          }
        })
      );
    }

    // Wait for all uploads
    await Promise.all(uploadPromises);

    toast({ title: "Contribution soumise", description: "Votre contribution sera examinée et publiée après validation par VLINKS." });
    supabase.functions.invoke("notify-vin-followers", { body: { vin, contribution_type: contributionType } }).catch(console.error);

    // Clear draft after successful submission
    clearDraft();
    onOpenChange(false);
    onSuccess?.();
  };

  const handleSubmit = async () => {
    if (!w.description || w.description.trim().length < 10) {
      toast({ title: "Description requise", description: "Minimum 10 caractères", variant: "destructive" });
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

      if (isOwnerClaim && ownerVerificationStatus === "none") {
        setShowVerification(true);
        setIsSubmitting(false);
        return;
      }

      await submitContribution(actualVinId, user.id);
    } catch (error) {
      console.error("Error submitting contribution:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue lors de l'envoi", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!verificationDocument || !verificationDocumentType) {
      toast({ title: "Formulaire incomplet", description: "Veuillez sélectionner un type et téléverser un document", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let actualVinId = vinId;
      if (!actualVinId) {
        const { data: existingVin } = await supabase.from("vins").select("id").eq("vin", vin).maybeSingle();
        if (existingVin) { actualVinId = existingVin.id; }
        else {
          const { data: newVin, error: vinError } = await supabase.from("vins").insert({ vin }).select("id").single();
          if (vinError) throw vinError;
          actualVinId = newVin.id;
        }
      }
      const filePath = `${user.id}/${actualVinId}/${Date.now()}_${verificationDocument.name}`;
      await supabase.storage.from("owner-verification-docs").upload(filePath, verificationDocument);
      const { error: insertError } = await supabase.from("owner_verifications").insert({
        user_id: user.id, vin_id: actualVinId, document_path: filePath,
        document_type: verificationDocumentType, verification_status: "pending",
      });
      if (insertError) {
        if (insertError.code === "23505") {
          toast({ title: "Demande existante", description: "Une demande existe déjà", variant: "destructive" });
          return;
        }
        throw insertError;
      }
      setOwnerVerificationStatus("pending");
      await submitContribution(actualVinId!, user.id);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipVerification = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let actualVinId = vinId;
      if (!actualVinId) {
        const { data: existingVin } = await supabase.from("vins").select("id").eq("vin", vin).maybeSingle();
        if (existingVin) { actualVinId = existingVin.id; }
        else {
          const { data: newVin, error: vinError } = await supabase.from("vins").insert({ vin }).select("id").single();
          if (vinError) throw vinError;
          actualVinId = newVin.id;
        }
      }
      await submitContribution(actualVinId!, user.id);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Step navigation ─────────────────────────────────────────────

  const canProceedStep1 = !!w.profile;
  const canProceedStep2 = !!w.category;
  const canProceedStep3 = w.description.trim().length >= 10;

  const goNext = () => {
    if (step < 4) setStep((s) => (s + 1) as WizardStep);
  };
  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as WizardStep);
  };

  // ─── Render helpers ──────────────────────────────────────────────

  const OptionButton = ({ selected, onClick, icon: Icon, label, description }: {
    selected: boolean; onClick: () => void; icon?: any; label: string; description?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
          : "border-border hover:border-muted-foreground/50 bg-muted/20"
      }`}
    >
      {Icon && <Icon className={`w-5 h-5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />}
      <div className="min-w-0">
        <p className={`font-medium text-sm ${selected ? "text-primary" : "text-foreground"}`}>{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {selected && <CheckCircle className="w-4 h-4 text-primary ml-auto shrink-0" />}
    </button>
  );

  const DateSelector = ({ label }: { label: string }) => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="grid grid-cols-2 gap-3">
        <Select onValueChange={(v) => updateW({ dateMonth: v })} value={w.dateMonth}>
          <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Mois" /></SelectTrigger>
          <SelectContent position="popper" className="max-h-60">
            {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => updateW({ dateYear: v })} value={w.dateYear}>
          <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Année" /></SelectTrigger>
          <SelectContent position="popper" className="max-h-60">
            {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const MileageField = () => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">
        Kilométrage <span className="text-muted-foreground font-normal">— optionnel</span>
      </Label>
      <Input
        value={w.mileage}
        onChange={(e) => updateW({ mileage: e.target.value })}
        placeholder="Ex: 124500"
        inputMode="numeric"
        pattern="[0-9]*"
        className="bg-muted/30"
      />
    </div>
  );

  const HolderSelector = () => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Qui détient actuellement le véhicule ?</Label>
      <div className="grid grid-cols-2 gap-2">
        {(["concessionnaire", "depot_vente", "particulier", "inconnu"] as const).map((ht) => {
          const labels: Record<string, string> = { concessionnaire: "Concessionnaire", depot_vente: "Dépôt-vente", particulier: "Particulier", inconnu: "Inconnu" };
          return (
            <button
              key={ht}
              type="button"
              onClick={() => updateW({ holderType: w.holderType === ht ? "" : ht })}
              className={`p-2.5 rounded-lg border text-sm text-center transition-all ${
                w.holderType === ht
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:border-muted-foreground/50 bg-muted/20 text-foreground"
              }`}
            >
              {labels[ht]}
            </button>
          );
        })}
      </div>
    </div>
  );

  const DealerNameField = () => {
    if (w.holderType !== "concessionnaire") return null;
    return (
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Nom du concessionnaire</Label>
        <Input
          value={w.dealerName}
          onChange={(e) => updateW({ dealerName: e.target.value })}
          placeholder="Ex: Concessionnaire Volvo Montréal"
          className="bg-muted/30"
        />
      </div>
    );
  };

  const ProvinceField = () => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">
        Province <span className="text-muted-foreground font-normal">— optionnel</span>
      </Label>
      <Select onValueChange={(v) => updateW({ province: v })} value={w.province}>
        <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
        <SelectContent position="popper" className="max-h-60">
          {provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  // ─── Verification step ───────────────────────────────────────────

  if (showVerification) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-strong">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-success" />
              Vérification de propriété
            </DialogTitle>
            <DialogDescription>VIN: <span className="font-mono">{vin}</span></DialogDescription>
          </DialogHeader>

          <div className="bg-success/10 border border-success/30 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium">Vous avez indiqué être propriétaire de ce véhicule.</p>
            <p className="text-sm text-muted-foreground">Téléversez un document prouvant votre propriété.</p>
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
                      verificationDocumentType === type.value ? "border-success bg-success/10" : "border-border hover:border-muted-foreground/50 bg-muted/30"
                    }`}
                  >
                    <p className={`font-medium text-sm ${verificationDocumentType === type.value ? "text-success" : "text-foreground"}`}>{type.label}</p>
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => setVerificationDocument(null)}><X className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={handleVerificationSubmit} variant="hero" className="w-full bg-success hover:bg-success/90" disabled={isSubmitting || !verificationDocument || !verificationDocumentType}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</> : <><Shield className="w-4 h-4 mr-2" />Valider mon statut</>}
            </Button>
            <Button type="button" variant="ghost" onClick={skipVerification} disabled={isSubmitting} className="text-muted-foreground">
              Continuer sans vérification
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Main wizard ─────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-strong">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            {isOwnerClaim && <User className="w-6 h-6 text-success" />}
            Contribuer
          </DialogTitle>
          <DialogDescription>VIN: <span className="font-mono">{vin}</span></DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Étape {step} / 4</span>
            <span>{step === 1 ? "Votre profil" : step === 2 ? "Type d'information" : step === 3 ? "Détails" : "Preuves"}</span>
          </div>
          <Progress value={(step / 4) * 100} className="h-1.5" />
        </div>

        {/* Draft notice */}
        {hasDraft && step === 1 && (
          <div className="bg-muted/30 border border-border rounded-xl p-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Brouillon restauré</p>
            <Button type="button" variant="ghost" size="sm" onClick={clearDraft} className="text-muted-foreground hover:text-destructive">
              <RotateCcw className="w-4 h-4 mr-1" />
              Réinitialiser
            </Button>
          </div>
        )}

        {/* Owner claim badge */}
        {isOwnerClaim && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-3 flex items-center gap-2">
            <User className="w-4 h-4 text-success" />
            <p className="text-sm font-medium">Propriétaire</p>
            {ownerVerificationStatus === "verified" && <Badge variant="verified" className="ml-auto"><CheckCircle className="w-3 h-3 mr-1" />Vérifié</Badge>}
            {ownerVerificationStatus === "pending" && <Badge variant="info" className="ml-auto"><Shield className="w-3 h-3 mr-1" />En cours</Badge>}
          </div>
        )}

        {/* ─── STEP 1: Profile ─── */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Qui êtes-vous ?</p>
            <div className="space-y-2">
              <OptionButton selected={w.profile === "buyer"} onClick={() => updateW({ profile: "buyer" })} icon={ShoppingCart} label="Acheteur / prospect" description="Vous envisagez d'acheter ce véhicule" />
              <OptionButton selected={w.profile === "current_owner"} onClick={() => updateW({ profile: "current_owner" })} icon={UserCheck} label="Propriétaire actuel" description="Vous possédez actuellement ce véhicule" />
              <OptionButton selected={w.profile === "former_owner"} onClick={() => updateW({ profile: "former_owner" })} icon={User} label="Ancien propriétaire" description="Vous avez possédé ce véhicule" />
              <OptionButton selected={w.profile === "professional"} onClick={() => updateW({ profile: "professional" })} icon={Wrench} label="Professionnel automobile" description="Mécanicien, concessionnaire, inspecteur..." />
              <OptionButton selected={w.profile === "other"} onClick={() => updateW({ profile: "other" })} icon={HelpCircle} label="Autre" description="Voisin, ami, passant..." />
            </div>
          </div>
        )}

        {/* ─── STEP 2: Category ─── */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Que souhaitez-vous partager ?</p>
            <div className="space-y-2">
              <OptionButton selected={w.category === "observation"} onClick={() => updateW({ category: "observation" })} icon={Eye} label="Observation sur le véhicule" description="Ce que vous avez constaté sur place" />
              <OptionButton selected={w.category === "document"} onClick={() => updateW({ category: "document" })} icon={FileSearch} label="Document ou rapport" description="Inspection, facture, historique..." />
              <OptionButton selected={w.category === "exchange"} onClick={() => updateW({ category: "exchange" })} icon={MessageCircle} label="Échange avec une personne" description="Vendeur, mécanicien, concessionnaire..." />
              <OptionButton selected={w.category === "event"} onClick={() => updateW({ category: "event" })} icon={CalendarDays} label="Événement du véhicule" description="Vente, changement de prix, propriétaire..." />
            </div>
          </div>
        )}

        {/* ─── STEP 3: Specific questions ─── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* ── Observation ── */}
            {w.category === "observation" && (
              <>
                <DateSelector label="Date de l'observation" />
                <MileageField />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Description de ce que vous avez observé *</Label>
                  <Textarea
                    value={w.description}
                    onChange={(e) => updateW({ description: e.target.value })}
                    placeholder="Ex: Jantes avant abîmées côté passager, traces de rouille sous le châssis..."
                    rows={4}
                    className="bg-muted/30 resize-none"
                  />
                </div>
              </>
            )}

            {/* ── Document ── */}
            {w.category === "document" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Type de document</Label>
                  <div className="space-y-2">
                    <OptionButton selected={w.documentSubType === "inspection_report"} onClick={() => updateW({ documentSubType: "inspection_report" })} label="Rapport d'inspection" />
                    <OptionButton selected={w.documentSubType === "invoice"} onClick={() => updateW({ documentSubType: "invoice" })} label="Facture d'entretien" />
                    <OptionButton selected={w.documentSubType === "vehicle_history"} onClick={() => updateW({ documentSubType: "vehicle_history" })} label="Historique véhicule" />
                    <OptionButton selected={w.documentSubType === "other_document"} onClick={() => updateW({ documentSubType: "other_document" })} label="Autre document" />
                  </div>
                </div>
                <DateSelector label="Date du document" />
                <MileageField />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Description *</Label>
                  <Textarea
                    value={w.description}
                    onChange={(e) => updateW({ description: e.target.value })}
                    placeholder="Ex: Rapport d'inspection complet réalisé par CAA Québec..."
                    rows={3}
                    className="bg-muted/30 resize-none"
                  />
                </div>
              </>
            )}

            {/* ── Exchange ── */}
            {w.category === "exchange" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Avec qui ?</Label>
                  <div className="space-y-2">
                    <OptionButton selected={w.exchangeSubType === "seller"} onClick={() => updateW({ exchangeSubType: "seller" })} label="Vendeur" />
                    <OptionButton selected={w.exchangeSubType === "mechanic"} onClick={() => updateW({ exchangeSubType: "mechanic" })} label="Mécanicien" />
                    <OptionButton selected={w.exchangeSubType === "dealer"} onClick={() => updateW({ exchangeSubType: "dealer" })} label="Concessionnaire" />
                    <OptionButton selected={w.exchangeSubType === "other_person"} onClick={() => updateW({ exchangeSubType: "other_person" })} label="Autre" />
                  </div>
                </div>
                <DateSelector label="Date de l'échange" />
                <MileageField />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Sujet discuté *</Label>
                  <Textarea
                    value={w.description}
                    onChange={(e) => updateW({ description: e.target.value })}
                    placeholder="Ex: Le vendeur mentionne un changement de courroie récent..."
                    rows={3}
                    className="bg-muted/30 resize-none"
                  />
                </div>
                {/* Seller type (if exchange with seller) */}
                {w.exchangeSubType === "seller" && (
                  <>
                    <HolderSelector />
                    <DealerNameField />
                    {w.holderType === "concessionnaire" && <ProvinceField />}
                  </>
                )}
              </>
            )}

            {/* ── Event ── */}
            {w.category === "event" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Type d'événement</Label>
                  <div className="space-y-2">
                    <OptionButton selected={w.eventSubType === "ownership_change"} onClick={() => updateW({ eventSubType: "ownership_change" })} label="Changement de propriétaire" />
                    <OptionButton selected={w.eventSubType === "for_sale"} onClick={() => updateW({ eventSubType: "for_sale" })} label="Mise en vente" />
                    <OptionButton selected={w.eventSubType === "price_change"} onClick={() => updateW({ eventSubType: "price_change" })} label="Modification du prix" />
                    <OptionButton selected={w.eventSubType === "current_status"} onClick={() => updateW({ eventSubType: "current_status" })} label="Statut actuel du véhicule" />
                  </div>
                </div>

                {/* Ownership change */}
                {w.eventSubType === "ownership_change" && (
                  <>
                    <DateSelector label="Date de la transaction" />
                    <MileageField />
                    <HolderSelector />
                    <DealerNameField />
                    <ProvinceField />
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Description *</Label>
                      <Textarea
                        value={w.description}
                        onChange={(e) => updateW({ description: e.target.value })}
                        placeholder="Ex: Véhicule vendu par Uslynn Auto..."
                        rows={3}
                        className="bg-muted/30 resize-none"
                      />
                    </div>
                  </>
                )}

                {/* For sale */}
                {w.eventSubType === "for_sale" && (
                  <>
                    <DateSelector label="Date de mise en vente" />
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Prix demandé ($) <span className="text-muted-foreground font-normal">— optionnel</span></Label>
                      <Input 
                        value={w.askingPrice} 
                        onChange={(e) => updateW({ askingPrice: e.target.value })} 
                        placeholder="Ex: 36900" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="bg-muted/30" 
                      />
                    </div>
                    <ProvinceField />
                    <HolderSelector />
                    <DealerNameField />
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Lien vers l'annonce <span className="text-muted-foreground font-normal">— optionnel</span></Label>
                      <Input value={w.listingUrl} onChange={(e) => updateW({ listingUrl: e.target.value })} placeholder="Ex: https://www.autohebdo.net/..." type="url" className="bg-muted/30" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Description *</Label>
                      <Textarea
                        value={w.description}
                        onChange={(e) => updateW({ description: e.target.value })}
                        placeholder="Ex: En vente chez Uslynn Auto, véhicule affiché sur AutoHebdo..."
                        rows={3}
                        className="bg-muted/30 resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Price change */}
                {w.eventSubType === "price_change" && (
                  <>
                    <DateSelector label="Date de modification du prix" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Ancien prix ($)</Label>
                        <Input 
                          value={w.oldPrice} 
                          onChange={(e) => updateW({ oldPrice: e.target.value })} 
                          placeholder="Ex: 39900" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="bg-muted/30" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Nouveau prix ($)</Label>
                        <Input 
                          value={w.askingPrice} 
                          onChange={(e) => updateW({ askingPrice: e.target.value })} 
                          placeholder="Ex: 36900" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="bg-muted/30" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Contexte *</Label>
                      <Textarea
                        value={w.description}
                        onChange={(e) => updateW({ description: e.target.value })}
                        placeholder="Ex: Annonce AutoTrader mise à jour avec baisse de prix..."
                        rows={3}
                        className="bg-muted/30 resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Current status */}
                {w.eventSubType === "current_status" && (
                  <>
                    <HolderSelector />
                    <DealerNameField />
                    {w.holderType === "concessionnaire" && <ProvinceField />}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Description *</Label>
                      <Textarea
                        value={w.description}
                        onChange={(e) => updateW({ description: e.target.value })}
                        placeholder="Ex: Le véhicule est actuellement chez un concessionnaire..."
                        rows={3}
                        className="bg-muted/30 resize-none"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── STEP 4: Evidence ─── */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">Preuve disponible ?</p>
            <div className="space-y-2">
              <OptionButton selected={w.evidenceType === "photo"} onClick={() => updateW({ evidenceType: "photo" })} icon={Camera} label="Photo" description="Ajouter des photos du véhicule" />
              <OptionButton selected={w.evidenceType === "document"} onClick={() => updateW({ evidenceType: "document" })} icon={FileText} label="Document" description="PDF, facture, rapport..." />
              <OptionButton selected={w.evidenceType === "none"} onClick={() => updateW({ evidenceType: "none" })} label="Aucune preuve" description="Continuer sans pièce jointe" />
            </div>

            {w.evidenceType === "photo" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Photos ({photos.length}/10)
                </Label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {photos.map((photo, index) => (
                    <div key={`photo-${index}-${photo.name}`} className="relative group aspect-square">
                      <img src={URL.createObjectURL(photo)} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg border border-border" />
                      <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
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
            )}

            {w.evidenceType === "document" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <File className="w-4 h-4" /> Documents ({documents.length}/5)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {documents.map((doc, index) => (
                    <div key={`doc-${index}-${doc.name}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm truncate max-w-[150px]">{doc.name}</span>
                      <button type="button" onClick={() => setDocuments((prev) => prev.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive">
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
                <p className="text-xs text-muted-foreground">🔒 Les documents servent uniquement de preuves internes.</p>
              </div>
            )}

            {/* Anonymous toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
              <div>
                <Label className="font-medium text-sm">Contribution anonyme</Label>
                <p className="text-xs text-muted-foreground">Votre nom ne sera pas affiché</p>
              </div>
              <Switch checked={w.isAnonymous} onCheckedChange={(checked) => updateW({ isAnonymous: checked })} />
            </div>
          </div>
        )}

        {/* ─── Navigation ─── */}
        <div className="flex gap-3 pt-2">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={goBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
          )}

          {step < 4 ? (
            <Button
              type="button"
              variant="hero"
              onClick={goNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              className="flex-1"
            >
              Suivant <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="hero"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 ${isOwnerClaim ? "bg-success hover:bg-success/90" : ""}`}
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</> : "Envoyer"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
