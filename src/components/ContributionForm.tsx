import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sanitizeSelectValue, desanitizeSelectValue } from "@/lib/sanitizeSelectValue";
import { buildSafeFilePath } from "@/lib/sanitizeFileName";
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
  UserCheck,
  HelpCircle,
  RotateCcw,
  Check,
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
  profile: ContributorProfile | null;
  category: InfoCategory | null;
  documentSubType: DocumentSubType | null;
  exchangeSubType: ExchangeSubType | null;
  eventSubType: EventSubType | null;
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
  evidenceType: "photo" | "document" | "none" | null;
  isAnonymous: boolean;
}

const initialWizardState: WizardState = {
  profile: null, category: null, documentSubType: null, exchangeSubType: null,
  eventSubType: null, dateMonth: "", dateYear: "", mileage: "", description: "",
  holderType: "", dealerName: "", province: "", askingPrice: "", oldPrice: "",
  listingUrl: "", evidenceType: null, isAnonymous: false,
};

const getDraftKey = (vin: string) => `vlinks_contribution_draft_${vin}`;

function resolveContributionType(state: WizardState): string {
  const { category, documentSubType, exchangeSubType, eventSubType } = state;
  if (category === "observation") return "observation";
  if (category === "document") {
    if (documentSubType === "inspection_report") return "inspection_report";
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
    return "observation";
  }
  return "observation";
}

// ─── Stepper steps config ────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "Profil" },
  { num: 2, label: "Type" },
  { num: 3, label: "Détails" },
  { num: 4, label: "Preuves" },
];

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
  vinId, vin, open, onOpenChange, onSuccess, isOwnerClaim = false,
}: ContributionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [step, setStep] = useState<WizardStep>(1);
  const [w, setW] = useState<WizardState>({ ...initialWizardState });
  const [hasDraft, setHasDraft] = useState(false);

  const [showVerification, setShowVerification] = useState(false);
  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState<"none" | "pending" | "verified">("none");
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);
  const [verificationDocumentType, setVerificationDocumentType] = useState("");

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
        const { data: verification } = await supabase.from("owner_verifications").select("verification_status").eq("user_id", user.id).eq("vin_id", checkVinId).maybeSingle();
        if (verification) setOwnerVerificationStatus(verification.verification_status === "verified" ? "verified" : verification.verification_status === "pending" ? "pending" : "none");
      }
    };
    checkOwnerStatus();
  }, [isOwnerClaim, open, vinId, vin]);

  useEffect(() => {
    if (open && vin) {
      const saved = localStorage.getItem(getDraftKey(vin));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.w && parsed.step) { setW(parsed.w); setStep(parsed.step); setHasDraft(true); }
        } catch { /* ignore */ }
      }
    }
  }, [open, vin]);

  useEffect(() => {
    if (open && vin && (w.profile || w.category || w.description)) {
      localStorage.setItem(getDraftKey(vin), JSON.stringify({ w, step }));
    }
  }, [open, vin, w, step]);

  useEffect(() => {
    if (!open) { setShowVerification(false); setVerificationDocument(null); setVerificationDocumentType(""); }
  }, [open]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1979 }, (_, i) => String(currentYear - i));

  const updateW = useCallback((partial: Partial<WizardState>) => {
    setW((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearDraft = useCallback(() => {
    if (vin) localStorage.removeItem(getDraftKey(vin));
    setStep(1); setW({ ...initialWizardState }); setDocuments([]); setPhotos([]); setHasDraft(false);
  }, [vin]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setPhotos((prev) => [...prev, ...Array.from(files).filter((f) => f.type.startsWith("image/"))].slice(0, 10));
    e.target.value = "";
  }, []);

  const handleDocumentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setDocuments((prev) => [...prev, ...Array.from(files).slice(0, 5 - prev.length)]);
    e.target.value = "";
  }, []);

  const handleVerificationDocumentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      if (files[0].size > 10 * 1024 * 1024) { toast({ title: "Fichier trop volumineux", description: "Max 10 Mo", variant: "destructive" }); return; }
      setVerificationDocument(files[0]);
    }
  }, [toast]);

  // ─── Submission ──────────────────────────────────────────────────

  const submitContribution = async (actualVinId: string, userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("username, public_id").eq("user_id", userId).maybeSingle();
    const authorLabel = w.isAnonymous ? "Anonyme" : (profile?.username || "Anonyme");
    const authorPublicId = w.isAnonymous ? null : (profile?.public_id || null);
    const contributionType = resolveContributionType(w);
    const title = w.description.substring(0, 200);
    const summary = w.description;
    const mileage = w.mileage ? parseInt(w.mileage.replace(/\s/g, ""), 10) : null;
    const validMileage = mileage && !isNaN(mileage) ? mileage : null;
    let interventionDate: string | null = null;
    if (w.dateYear) {
      const monthIndex = w.dateMonth ? months.indexOf(w.dateMonth) + 1 : 1;
      interventionDate = `${w.dateYear}-${String(monthIndex).padStart(2, "0")}-01`;
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
      title, summary, details: null, is_anonymous: w.isAnonymous, is_owner_contribution: isOwnerClaim,
      mileage_at_intervention: validMileage, intervention_date: interventionDate,
      province, holder_type: holderType, dealer_name: dealerName,
      asking_price: validAskingPrice, old_price: validOldPrice, listing_url: listingUrl,
    } as any);
    if (rawError) throw rawError;

    const { data: contribution, error: contributionError } = await supabase.from("vin_contributions").insert({
      vin_id: actualVinId, user_id: userId, contribution_type: contributionType as any,
      title, summary, details: null, is_anonymous: w.isAnonymous,
    }).select().single();
    if (contributionError) throw contributionError;

    await supabase.from("public_contributions").insert({
      user_id: userId, vin_id: actualVinId, contribution_type: contributionType,
      is_anonymous: w.isAnonymous, is_owner_contribution: isOwnerClaim,
      author_label: authorLabel, author_public_id: authorPublicId, status: "pending",
      title, summary, details: null,
      mileage_at_intervention: validMileage, intervention_date: interventionDate,
      province, holder_type: holderType, dealer_name: dealerName,
      asking_price: validAskingPrice, old_price: validOldPrice, listing_url: listingUrl,
    } as any);

    const uploadPromises: Promise<void>[] = [];
    for (const doc of documents) {
      const filePath = buildSafeFilePath(`${userId}/${contribution.id}`, doc.name);
      uploadPromises.push(
        supabase.storage.from("vin-documents").upload(filePath, doc).then(async ({ error: uploadError }) => {
          if (!uploadError) await supabase.from("contribution_documents").insert({ contribution_id: contribution.id, file_name: doc.name, file_path: filePath, file_type: doc.type, file_size: doc.size });
        })
      );
    }
    for (const photo of photos) {
      const filePath = buildSafeFilePath(`${userId}/${contribution.id}`, photo.name);
      uploadPromises.push(
        supabase.storage.from("vin-photos").upload(filePath, photo).then(async ({ error: uploadError }) => {
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("vin-photos").getPublicUrl(filePath);
            await supabase.from("contribution_photos").insert({ contribution_id: contribution.id, file_name: photo.name, file_path: urlData.publicUrl });
          }
        })
      );
    }
    await Promise.all(uploadPromises);

    toast({ title: "Contribution enregistrée ✓", description: "Vous pouvez la suivre dans Mon profil > Contributions." });
    supabase.functions.invoke("notify-vin-followers", { body: { vin, contribution_type: contributionType } }).catch(console.error);
    clearDraft();
    onOpenChange(false);
    onSuccess?.();
  };

  const handleSubmit = async () => {
    if (!w.description || w.description.trim().length < 10) {
      toast({ title: "Description requise", description: "Minimum 10 caractères", variant: "destructive" }); return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Erreur", description: "Connexion requise", variant: "destructive" }); return; }
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
      if (isOwnerClaim && ownerVerificationStatus === "none") { setShowVerification(true); setIsSubmitting(false); return; }
      await submitContribution(actualVinId, user.id);
    } catch (error) {
      console.error("Error submitting contribution:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleVerificationSubmit = async () => {
    if (!verificationDocument || !verificationDocumentType) {
      toast({ title: "Formulaire incomplet", variant: "destructive" }); return;
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
      const filePath = buildSafeFilePath(`${user.id}/${actualVinId}`, verificationDocument.name);
      await supabase.storage.from("owner-verification-docs").upload(filePath, verificationDocument);
      const { error: insertError } = await supabase.from("owner_verifications").insert({
        user_id: user.id, vin_id: actualVinId, document_path: filePath,
        document_type: verificationDocumentType, verification_status: "pending",
      });
      if (insertError) { if (insertError.code === "23505") { toast({ title: "Demande existante", variant: "destructive" }); return; } throw insertError; }
      setOwnerVerificationStatus("pending");
      await submitContribution(actualVinId!, user.id);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Erreur", variant: "destructive" });
    } finally { setIsSubmitting(false); }
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
      toast({ title: "Erreur", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  // ─── Step navigation ─────────────────────────────────────────────

  const canProceedStep1 = !!w.profile;
  const canProceedStep2 = !!w.category;
  const canProceedStep3 = w.description.trim().length >= 10;

  const goNext = () => { if (step < 4) setStep((s) => (s + 1) as WizardStep); };
  const goBack = () => { if (step > 1) setStep((s) => (s - 1) as WizardStep); };

  // ─── Render ──────────────────────────────────────────────────────

  // Verification step
  if (showVerification) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-muted/30">
          <WizardHeader vin={vin} title="Vérification de propriété" subtitle="Prouvez que vous êtes le propriétaire" />
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
            <div className="rounded-xl bg-success/5 border border-success/20 p-4">
              <p className="text-sm font-medium text-foreground">Vous avez indiqué être propriétaire de ce véhicule.</p>
              <p className="text-xs text-muted-foreground mt-1">Téléversez un document prouvant votre propriété.</p>
            </div>

            <FormSection title="Type de document">
              <div className="space-y-2">
                {documentTypes.map((type) => (
                  <OptionCard key={type.value} selected={verificationDocumentType === type.value} onClick={() => setVerificationDocumentType(type.value)} label={type.label} description={type.description} />
                ))}
              </div>
            </FormSection>

            <FormSection title="Document de vérification">
              {!verificationDocument ? (
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-success/40 transition-colors bg-card">
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">PDF, JPG, PNG — max 10 Mo</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleVerificationDocumentUpload} className="hidden" />
                </label>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{verificationDocument.name}</p>
                    <p className="text-xs text-muted-foreground">{(verificationDocument.size / 1024).toFixed(1)} Ko</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVerificationDocument(null)}><X className="w-4 h-4" /></Button>
                </div>
              )}
            </FormSection>
          </div>

          <WizardFooter>
            <Button variant="outline" onClick={skipVerification} disabled={isSubmitting} className="flex-1 bg-card">
              Passer cette étape
            </Button>
            <Button onClick={handleVerificationSubmit} disabled={isSubmitting || !verificationDocument || !verificationDocumentType} className="flex-1">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</> : <><Shield className="w-4 h-4 mr-2" />Valider</>}
            </Button>
          </WizardFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // ─── Main wizard ─────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-muted/30">
        {/* Fixed header with stepper */}
        <div className="border-b border-border bg-card">
          <SheetHeader className="p-5 pb-0">
            <div className="flex items-center gap-3">
              {isOwnerClaim && <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center"><User className="w-4 h-4 text-success" /></div>}
              <div>
                <SheetTitle className="font-display text-lg">Contribuer au dossier</SheetTitle>
                <SheetDescription className="text-xs">
                  VIN <code className="vin-code">{vin}</code>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Stepper */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all ${
                      step > s.num
                        ? "bg-primary text-primary-foreground"
                        : step === s.num
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${
                      step >= s.num ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-2 transition-colors ${
                      step > s.num ? "bg-primary" : "bg-border"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Draft notice */}
        {hasDraft && step === 1 && (
          <div className="mx-5 mt-4 bg-card border border-border rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Brouillon restauré</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearDraft} className="text-xs text-muted-foreground hover:text-destructive h-7">
              <RotateCcw className="w-3 h-3 mr-1" /> Effacer
            </Button>
          </div>
        )}

        {/* Owner claim badge */}
        {isOwnerClaim && (
          <div className="mx-5 mt-4 bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Mode propriétaire</p>
              <p className="text-xs text-muted-foreground">Votre contribution sera marquée comme vérifiée</p>
            </div>
            {ownerVerificationStatus === "verified" && <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Vérifié</Badge>}
            {ownerVerificationStatus === "pending" && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]"><Shield className="w-3 h-3 mr-1" />En cours</Badge>}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">

          {/* ─── STEP 1: Profile ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <FormSection title="Qui êtes-vous ?" subtitle="Sélectionnez votre rapport avec ce véhicule">
                <div className="space-y-2">
                  <OptionCard selected={w.profile === "buyer"} onClick={() => updateW({ profile: "buyer" })} icon={ShoppingCart} label="Acheteur / prospect" description="Vous envisagez d'acheter ce véhicule" />
                  <OptionCard selected={w.profile === "current_owner"} onClick={() => updateW({ profile: "current_owner" })} icon={UserCheck} label="Propriétaire actuel" description="Vous possédez actuellement ce véhicule" />
                  <OptionCard selected={w.profile === "former_owner"} onClick={() => updateW({ profile: "former_owner" })} icon={User} label="Ancien propriétaire" description="Vous avez possédé ce véhicule" />
                  <OptionCard selected={w.profile === "professional"} onClick={() => updateW({ profile: "professional" })} icon={Wrench} label="Professionnel automobile" description="Mécanicien, concessionnaire, inspecteur..." />
                  <OptionCard selected={w.profile === "other"} onClick={() => updateW({ profile: "other" })} icon={HelpCircle} label="Autre" description="Voisin, ami, passant..." />
                </div>
              </FormSection>
            </div>
          )}

          {/* ─── STEP 2: Category ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <FormSection title="Type d'information" subtitle="Que souhaitez-vous partager ?">
                <div className="space-y-2">
                  <OptionCard selected={w.category === "observation"} onClick={() => updateW({ category: "observation" })} icon={Eye} label="Observation" description="Ce que vous avez constaté sur place" />
                  <OptionCard selected={w.category === "document"} onClick={() => updateW({ category: "document" })} icon={FileSearch} label="Document ou rapport" description="Inspection, facture, historique..." />
                  <OptionCard selected={w.category === "exchange"} onClick={() => updateW({ category: "exchange" })} icon={MessageCircle} label="Échange avec une personne" description="Vendeur, mécanicien, concessionnaire..." />
                  <OptionCard selected={w.category === "event"} onClick={() => updateW({ category: "event" })} icon={CalendarDays} label="Événement du véhicule" description="Vente, changement de prix, propriétaire..." />
                </div>
              </FormSection>
            </div>
          )}

          {/* ─── STEP 3: Details ─── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Observation */}
              {w.category === "observation" && (
                <>
                  <FormSection title="Contexte de l'observation">
                    <div className="grid grid-cols-2 gap-3">
                      <DateField label="Mois" type="month" value={w.dateMonth} onChange={(v) => updateW({ dateMonth: v })} />
                      <DateField label="Année" type="year" value={w.dateYear} onChange={(v) => updateW({ dateYear: v })} yearOptions={yearOptions} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <MileageInput value={w.mileage} onChange={(v) => updateW({ mileage: v })} />
                      <PriceInput value={w.askingPrice} onChange={(v) => updateW({ askingPrice: v })} label="Prix observé" />
                    </div>
                  </FormSection>
                  <FormSection title="Description *">
                    <Textarea value={w.description} onChange={(e) => updateW({ description: e.target.value })}
                      placeholder="Ex: Jantes avant abîmées côté passager, traces de rouille sous le châssis..."
                      rows={4} className="bg-card border-border resize-none" />
                  </FormSection>
                </>
              )}

              {/* Document */}
              {w.category === "document" && (
                <>
                  <FormSection title="Type de document">
                    <div className="grid grid-cols-2 gap-2">
                      {(["inspection_report", "invoice", "vehicle_history", "other_document"] as const).map((dt) => {
                        const labels: Record<string, string> = { inspection_report: "Rapport d'inspection", invoice: "Facture d'entretien", vehicle_history: "Historique véhicule", other_document: "Autre document" };
                        return <ChipButton key={dt} selected={w.documentSubType === dt} onClick={() => updateW({ documentSubType: dt })} label={labels[dt]} />;
                      })}
                    </div>
                  </FormSection>
                  <FormSection title="Contexte">
                    <div className="grid grid-cols-2 gap-3">
                      <DateField label="Mois" type="month" value={w.dateMonth} onChange={(v) => updateW({ dateMonth: v })} />
                      <DateField label="Année" type="year" value={w.dateYear} onChange={(v) => updateW({ dateYear: v })} yearOptions={yearOptions} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <MileageInput value={w.mileage} onChange={(v) => updateW({ mileage: v })} />
                      <PriceInput value={w.askingPrice} onChange={(v) => updateW({ askingPrice: v })} label="Prix observé" />
                    </div>
                  </FormSection>
                  <FormSection title="Description *">
                    <Textarea value={w.description} onChange={(e) => updateW({ description: e.target.value })}
                      placeholder="Ex: Rapport d'inspection complet réalisé par CAA Québec..."
                      rows={3} className="bg-card border-border resize-none" />
                  </FormSection>
                </>
              )}

              {/* Exchange */}
              {w.category === "exchange" && (
                <>
                  <FormSection title="Avec qui ?">
                    <div className="grid grid-cols-2 gap-2">
                      {(["seller", "mechanic", "dealer", "other_person"] as const).map((st) => {
                        const labels: Record<string, string> = { seller: "Vendeur", mechanic: "Mécanicien", dealer: "Concessionnaire", other_person: "Autre" };
                        return <ChipButton key={st} selected={w.exchangeSubType === st} onClick={() => updateW({ exchangeSubType: st })} label={labels[st]} />;
                      })}
                    </div>
                  </FormSection>
                  <FormSection title="Contexte">
                    <div className="grid grid-cols-2 gap-3">
                      <DateField label="Mois" type="month" value={w.dateMonth} onChange={(v) => updateW({ dateMonth: v })} />
                      <DateField label="Année" type="year" value={w.dateYear} onChange={(v) => updateW({ dateYear: v })} yearOptions={yearOptions} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <MileageInput value={w.mileage} onChange={(v) => updateW({ mileage: v })} />
                      <PriceInput value={w.askingPrice} onChange={(v) => updateW({ askingPrice: v })} label="Prix observé" />
                    </div>
                  </FormSection>
                  <FormSection title="Sujet discuté *">
                    <Textarea value={w.description} onChange={(e) => updateW({ description: e.target.value })}
                      placeholder="Ex: Le vendeur mentionne un changement de courroie récent..."
                      rows={3} className="bg-card border-border resize-none" />
                  </FormSection>
                  {w.exchangeSubType === "seller" && (
                    <FormSection title="Informations vendeur">
                      <HolderGrid value={w.holderType} onChange={(v) => updateW({ holderType: w.holderType === v ? "" : v })} />
                      {w.holderType === "concessionnaire" && (
                        <div className="space-y-2 mt-3">
                          <Label className="text-xs font-medium text-muted-foreground">Nom du concessionnaire</Label>
                          <Input value={w.dealerName} onChange={(e) => updateW({ dealerName: e.target.value })} placeholder="Ex: Volvo Montréal" className="bg-card border-border" />
                        </div>
                      )}
                      {w.holderType === "concessionnaire" && <ProvinceSelect value={w.province} onChange={(v) => updateW({ province: v })} />}
                    </FormSection>
                  )}
                </>
              )}

              {/* Event */}
              {w.category === "event" && (
                <>
                  <FormSection title="Type d'événement">
                    <div className="grid grid-cols-2 gap-2">
                      {(["ownership_change", "for_sale", "price_change", "current_status"] as const).map((et) => {
                        const labels: Record<string, string> = { ownership_change: "Changement de propriétaire", for_sale: "Mise en vente", price_change: "Modification du prix", current_status: "Statut actuel" };
                        return <ChipButton key={et} selected={w.eventSubType === et} onClick={() => updateW({ eventSubType: et })} label={labels[et]} />;
                      })}
                    </div>
                  </FormSection>

                  {w.eventSubType === "ownership_change" && (
                    <>
                      <FormSection title="Contexte">
                        <div className="grid grid-cols-2 gap-3">
                          <DateField label="Mois" type="month" value={w.dateMonth} onChange={(v) => updateW({ dateMonth: v })} />
                          <DateField label="Année" type="year" value={w.dateYear} onChange={(v) => updateW({ dateYear: v })} yearOptions={yearOptions} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <MileageInput value={w.mileage} onChange={(v) => updateW({ mileage: v })} />
                          <PriceInput value={w.askingPrice} onChange={(v) => updateW({ askingPrice: v })} label="Prix de transaction" />
                        </div>
                        <HolderGrid value={w.holderType} onChange={(v) => updateW({ holderType: w.holderType === v ? "" : v })} label="Nouveau détenteur du véhicule" />
                        {w.holderType === "concessionnaire" && <Input value={w.dealerName} onChange={(e) => updateW({ dealerName: e.target.value })} placeholder="Nom du concessionnaire" className="bg-card border-border mt-2" />}
                        <ProvinceSelect value={w.province} onChange={(v) => updateW({ province: v })} />
                      </FormSection>
                      <FormSection title="Description *">
                        <Textarea value={w.description} onChange={(e) => updateW({ description: e.target.value })} placeholder="Ex: Véhicule vendu par Uslynn Auto..." rows={3} className="bg-card border-border resize-none" />
                      </FormSection>
                    </>
                  )}

                  {w.eventSubType === "for_sale" && (
                    <>
                      <FormSection title="Détails de la mise en vente">
                        <div className="grid grid-cols-2 gap-3">
                          <DateField label="Mois" type="month" value={w.dateMonth} onChange={(v) => updateW({ dateMonth: v })} />
                          <DateField label="Année" type="year" value={w.dateYear} onChange={(v) => updateW({ dateYear: v })} yearOptions={yearOptions} />
                        </div>
                        <PriceInput value={w.askingPrice} onChange={(v) => updateW({ askingPrice: v })} label="Prix demandé" />
                        <ProvinceSelect value={w.province} onChange={(v) => updateW({ province: v })} />
                        <HolderGrid value={w.holderType} onChange={(v) => updateW({ holderType: w.holderType === v ? "" : v })} />
                        {w.holderType === "concessionnaire" && <Input value={w.dealerName} onChange={(e) => updateW({ dealerName: e.target.value })} placeholder="Nom du concessionnaire" className="bg-card border-border mt-2" />}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">Lien vers l'annonce</Label>
                          <Input value={w.listingUrl} onChange={(e) => updateW({ listingUrl: e.target.value })} placeholder="https://..." type="url" className="bg-card border-border" />
                        </div>
                      </FormSection>
                      <FormSection title="Description *">
                        <Textarea value={w.description} onChange={(e) => updateW({ description: e.target.value })} placeholder="Ex: En vente chez Uslynn Auto..." rows={3} className="bg-card border-border resize-none" />
                      </FormSection>
                    </>
                  )}

                  {w.eventSubType === "price_change" && (
                    <>
                      <FormSection title="Modification de prix">
                        <div className="grid grid-cols-2 gap-3">
                          <DateField label="Mois" type="month" value={w.dateMonth} onChange={(v) => updateW({ dateMonth: v })} />
                          <DateField label="Année" type="year" value={w.dateYear} onChange={(v) => updateW({ dateYear: v })} yearOptions={yearOptions} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <PriceInput value={w.oldPrice} onChange={(v) => updateW({ oldPrice: v })} label="Ancien prix" />
                          <PriceInput value={w.askingPrice} onChange={(v) => updateW({ askingPrice: v })} label="Nouveau prix affiché" />
                        </div>
                      </FormSection>
                      <FormSection title="Contexte *">
                        <Textarea value={w.description} onChange={(e) => updateW({ description: e.target.value })} placeholder="Ex: Annonce mise à jour avec baisse de prix..." rows={3} className="bg-card border-border resize-none" />
                      </FormSection>
                    </>
                  )}

                  {w.eventSubType === "current_status" && (
                    <>
                      <FormSection title="Statut actuel">
                        <div className="grid grid-cols-2 gap-3">
                          <MileageInput value={w.mileage} onChange={(v) => updateW({ mileage: v })} />
                          <PriceInput value={w.askingPrice} onChange={(v) => updateW({ askingPrice: v })} label="Prix observé" />
                        </div>
                        <HolderGrid value={w.holderType} onChange={(v) => updateW({ holderType: w.holderType === v ? "" : v })} />
                        {w.holderType === "concessionnaire" && <Input value={w.dealerName} onChange={(e) => updateW({ dealerName: e.target.value })} placeholder="Nom du concessionnaire" className="bg-card border-border mt-2" />}
                        {w.holderType === "concessionnaire" && <ProvinceSelect value={w.province} onChange={(v) => updateW({ province: v })} />}
                      </FormSection>
                      <FormSection title="Description *">
                        <Textarea value={w.description} onChange={(e) => updateW({ description: e.target.value })} placeholder="Ex: Le véhicule est actuellement chez un concessionnaire..." rows={3} className="bg-card border-border resize-none" />
                      </FormSection>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── STEP 4: Evidence ─── */}
          {step === 4 && (
            <div className="space-y-5">
              <FormSection title="Preuves disponibles" subtitle="Ajoutez des photos ou documents pour renforcer votre contribution">
                <div className="space-y-2">
                  <OptionCard selected={w.evidenceType === "photo"} onClick={() => updateW({ evidenceType: "photo" })} icon={Camera} label="Photos" description="Ajouter des photos du véhicule" />
                  <OptionCard selected={w.evidenceType === "document"} onClick={() => updateW({ evidenceType: "document" })} icon={FileText} label="Documents" description="PDF, facture, rapport..." />
                  <OptionCard selected={w.evidenceType === "none"} onClick={() => updateW({ evidenceType: "none" })} label="Aucune preuve" description="Continuer sans pièce jointe" />
                </div>
              </FormSection>

              {w.evidenceType === "photo" && (
                <FormSection title={`Photos (${photos.length}/10)`}>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {photos.map((photo, index) => (
                      <div key={`photo-${index}-${photo.name}`} className="relative group aspect-square">
                        <img src={URL.createObjectURL(photo)} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-xl border border-border" />
                        <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))} className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 10 && (
                      <label className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-card">
                        <ImageIcon className="w-5 h-5 text-muted-foreground mb-1" />
                        <span className="text-[10px] text-muted-foreground">Ajouter</span>
                        <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" multiple />
                      </label>
                    )}
                  </div>
                </FormSection>
              )}

              {w.evidenceType === "document" && (
                <FormSection title={`Documents (${documents.length}/5)`}>
                  <div className="space-y-2">
                    {documents.map((doc, index) => (
                      <div key={`doc-${index}-${doc.name}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <File className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm truncate flex-1">{doc.name}</span>
                        <button type="button" onClick={() => setDocuments((prev) => prev.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {documents.length < 5 && (
                      <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-card">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Ajouter un document</span>
                        <input type="file" className="hidden" onChange={handleDocumentUpload} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" multiple />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">🔒 Les documents servent uniquement de preuves internes.</p>
                </FormSection>
              )}

              {/* Anonymous toggle */}
              <div className="rounded-xl bg-card border border-border p-4 flex items-center justify-between">
                <div>
                  <Label className="font-medium text-sm">Contribution anonyme</Label>
                  <p className="text-xs text-muted-foreground">Votre nom ne sera pas affiché publiquement</p>
                </div>
                <Switch checked={w.isAnonymous} onCheckedChange={(checked) => updateW({ isAnonymous: checked })} />
              </div>
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <WizardFooter>
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={goBack} className="flex-1 bg-card">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
              Annuler
            </Button>
          )}

          {step < 4 ? (
            <Button type="button" onClick={goNext}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) || (step === 3 && !canProceedStep3)}
              className="flex-1 shadow-sm">
              Suivant <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}
              className={`flex-1 shadow-sm ${isOwnerClaim ? "bg-success hover:bg-success/90" : ""}`}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</> : "Envoyer la contribution"}
            </Button>
          )}
        </WizardFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function WizardHeader({ vin, title, subtitle }: { vin: string; title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      <p className="text-xs text-muted-foreground mt-1">VIN <code className="vin-code">{vin}</code></p>
    </div>
  );
}

function WizardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-border bg-card p-4 flex gap-3">
      {children}
    </div>
  );
}

function FormSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function OptionCard({ selected, onClick, icon: Icon, label, description }: {
  selected: boolean; onClick: () => void; icon?: any; label: string; description?: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-background hover:border-muted-foreground/30"
      }`}>
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          selected ? "bg-primary/10" : "bg-muted"
        }`}>
          <Icon className={`w-4.5 h-4.5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-medium text-sm ${selected ? "text-primary" : "text-foreground"}`}>{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {selected && (
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function ChipButton({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-center transition-all ${
        selected
          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
          : "border-border bg-background text-foreground hover:border-muted-foreground/30"
      }`}>
      {label}
    </button>
  );
}

function DateField({ label, type, value, onChange, yearOptions }: {
  label: string; type: "month" | "year"; value: string; onChange: (v: string) => void; yearOptions?: string[];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Select onValueChange={onChange} value={sanitizeSelectValue(value, "__placeholder__")}>
        <SelectTrigger className="bg-card border-border h-10"><SelectValue placeholder={type === "month" ? "Mois" : "Année"} /></SelectTrigger>
        <SelectContent position="popper" className="max-h-60">
          {type === "month"
            ? months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
            : (yearOptions || []).map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)
          }
        </SelectContent>
      </Select>
    </div>
  );
}

function MileageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">
        Kilométrage <span className="font-normal">— optionnel</span>
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ex: 124500" inputMode="numeric" pattern="[0-9]*" className="bg-card border-border" />
    </div>
  );
}

function HolderGrid({ value, onChange, label }: { value: string; onChange: (v: HolderType) => void; label?: string }) {
  const options: { key: HolderType; label: string }[] = [
    { key: "concessionnaire", label: "Concessionnaire" },
    { key: "depot_vente", label: "Dépôt-vente" },
    { key: "particulier", label: "Particulier" },
    { key: "inconnu", label: "Inconnu" },
  ];
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label || "Détenteur du véhicule"}</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <ChipButton key={o.key} selected={value === o.key} onClick={() => onChange(o.key)} label={o.label} />
        ))}
      </div>
    </div>
  );
}

function ProvinceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">Province <span className="font-normal">— optionnel</span></Label>
      <Select onValueChange={onChange} value={sanitizeSelectValue(value, "__placeholder__")}>
        <SelectTrigger className="bg-card border-border h-10"><SelectValue placeholder="Sélectionner une province" /></SelectTrigger>
        <SelectContent position="popper" className="max-h-60">
          {provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
