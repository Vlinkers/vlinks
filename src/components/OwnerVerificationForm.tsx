import { useState, useCallback, useEffect } from "react";
import { buildSafeFilePath } from "@/lib/sanitizeFileName";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Upload,
  X,
  Shield,
  FileText,
  CheckCircle,
  Lock,
  Clock,
  Camera,
  Link2,
  Loader2,
  Search,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type VerificationTier = "certificate_only" | "certificate_plus_vin" | "chain_of_trust" | null;

type TierStatus = "locked" | "available" | "pending" | "completed";

interface OwnerVerificationFormProps {
  vinId: string;
  userId: string;
  currentTier: VerificationTier;
  vin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface VerificationData {
  certificate_file_path: string | null;
  vin_plate_photo_path: string | null;
  chain_of_trust_from: string | null;
  chain_of_trust_confirmed_at: string | null;
  verification_status: string;
  verification_tier: VerificationTier;
}

function getTierStatuses(currentTier: VerificationTier, verificationData: VerificationData | null): [TierStatus, TierStatus, TierStatus] {
  // If no verification record exists yet
  if (!verificationData) {
    return ["available", "locked", "locked"];
  }

  const status = verificationData.verification_status;
  const hasCert = !!verificationData.certificate_file_path;
  const hasVinPhoto = !!verificationData.vin_plate_photo_path;
  const hasChain = !!verificationData.chain_of_trust_from;

  // Tier 1 status
  let tier1: TierStatus = "available";
  if (hasCert && (currentTier === "certificate_only" || currentTier === "certificate_plus_vin" || currentTier === "chain_of_trust")) {
    tier1 = "completed";
  } else if (hasCert && status === "pending") {
    tier1 = "pending";
  } else if (hasCert) {
    tier1 = "completed";
  }

  // Tier 2 status
  let tier2: TierStatus = "locked";
  if (currentTier === "certificate_plus_vin" || currentTier === "chain_of_trust") {
    tier2 = "completed";
  } else if (hasVinPhoto && status === "pending") {
    tier2 = "pending";
  } else if (hasVinPhoto) {
    tier2 = "completed";
  } else if (tier1 === "completed") {
    tier2 = "available";
  }

  // Tier 3 status
  let tier3: TierStatus = "locked";
  if (currentTier === "chain_of_trust") {
    tier3 = "completed";
  } else if (hasChain && verificationData.chain_of_trust_confirmed_at) {
    tier3 = "completed";
  } else if (hasChain) {
    tier3 = "pending";
  } else if (tier2 === "completed") {
    tier3 = "available";
  }

  return [tier1, tier2, tier3];
}

const tierBadges = [
  "Propriétaire déclaré",
  "Propriétaire confirmé",
  "Propriétaire certifié",
];

export function OwnerVerificationForm({
  vinId,
  userId,
  currentTier,
  vin,
  open,
  onOpenChange,
  onSuccess,
}: OwnerVerificationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [vinPlateFile, setVinPlateFile] = useState<File | null>(null);
  const [formerOwnerSearch, setFormerOwnerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; username: string; display_name: string | null }>>([]);
  const [selectedFormerOwner, setSelectedFormerOwner] = useState<{ user_id: string; username: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch existing verification data
  useEffect(() => {
    if (!open || !vinId || !userId) return;
    const fetch = async () => {
      setLoadingData(true);
      const { data } = await supabase
        .from("owner_verifications")
        .select("certificate_file_path, vin_plate_photo_path, chain_of_trust_from, chain_of_trust_confirmed_at, verification_status, verification_tier")
        .eq("vin_id", vinId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setVerificationData(data as VerificationData | null);
      setLoadingData(false);
    };
    fetch();
  }, [open, vinId, userId]);

  const [tier1Status, tier2Status, tier3Status] = getTierStatuses(currentTier, verificationData);

  const handleFileUpload = useCallback(
    (setter: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        if (files[0].size > 10 * 1024 * 1024) {
          toast({ title: "Fichier trop volumineux", description: "Maximum 10 Mo", variant: "destructive" });
          return;
        }
        setter(files[0]);
      }
    },
    [toast]
  );

  const searchFormerOwners = useCallback(async () => {
    if (formerOwnerSearch.length < 2) return;
    setIsSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .neq("user_id", userId)
      .or(`username.ilike.%${formerOwnerSearch}%,display_name.ilike.%${formerOwnerSearch}%`)
      .limit(5);
    setSearchResults((data as Array<{ user_id: string; username: string; display_name: string | null }>) || []);
    setIsSearching(false);
  }, [formerOwnerSearch, userId]);

  const uploadFile = async (file: File, subfolder: string): Promise<string> => {
    const filePath = buildSafeFilePath(`${userId}/${vinId}/${subfolder}`, file.name);
    const { error } = await supabase.storage.from("verifications").upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const handleSubmitTier1 = async () => {
    if (!certificateFile) return;
    setIsSubmitting(true);
    try {
      const certPath = await uploadFile(certificateFile, "certificate");

      if (verificationData) {
        const { error } = await supabase
          .from("owner_verifications")
          .update({
            certificate_file_path: certPath,
            document_type: "certificate",
            verification_status: "pending",
          })
          .eq("vin_id", vinId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("owner_verifications")
          .insert({
            user_id: userId,
            vin_id: vinId,
            certificate_file_path: certPath,
            document_type: "certificate",
            verification_status: "pending",
          });
        if (error) throw error;
      }

      toast({ title: "Certificat envoyé", description: "Votre certificat est en cours de vérification." });
      setCertificateFile(null);
      onSuccess?.();
      // Refresh data
      const { data } = await supabase
        .from("owner_verifications")
        .select("certificate_file_path, vin_plate_photo_path, chain_of_trust_from, chain_of_trust_confirmed_at, verification_status, verification_tier")
        .eq("vin_id", vinId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setVerificationData(data as VerificationData | null);
    } catch (err) {
      console.error("Tier 1 error:", err);
      toast({ title: "Erreur", description: "Impossible d'envoyer le certificat", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTier2 = async () => {
    if (!vinPlateFile) return;
    setIsSubmitting(true);
    try {
      const photoPath = await uploadFile(vinPlateFile, "vin-plate");

      const { error } = await supabase
        .from("owner_verifications")
        .update({
          vin_plate_photo_path: photoPath,
          verification_status: "pending",
        })
        .eq("vin_id", vinId)
        .eq("user_id", userId);
      if (error) throw error;

      toast({ title: "Photo envoyée", description: "Votre photo de plaque VIN est en cours de vérification." });
      setVinPlateFile(null);
      onSuccess?.();
      const { data } = await supabase
        .from("owner_verifications")
        .select("certificate_file_path, vin_plate_photo_path, chain_of_trust_from, chain_of_trust_confirmed_at, verification_status, verification_tier")
        .eq("vin_id", vinId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setVerificationData(data as VerificationData | null);
    } catch (err) {
      console.error("Tier 2 error:", err);
      toast({ title: "Erreur", description: "Impossible d'envoyer la photo", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTier3 = async () => {
    if (!selectedFormerOwner) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("owner_verifications")
        .update({
          chain_of_trust_from: selectedFormerOwner.user_id,
          verification_status: "pending",
        })
        .eq("vin_id", vinId)
        .eq("user_id", userId);
      if (error) throw error;

      toast({ title: "Demande envoyée", description: `Une demande de confirmation a été envoyée à @${selectedFormerOwner.username}.` });
      setSelectedFormerOwner(null);
      setFormerOwnerSearch("");
      onSuccess?.();
      const { data } = await supabase
        .from("owner_verifications")
        .select("certificate_file_path, vin_plate_photo_path, chain_of_trust_from, chain_of_trust_confirmed_at, verification_status, verification_tier")
        .eq("vin_id", vinId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setVerificationData(data as VerificationData | null);
    } catch (err) {
      console.error("Tier 3 error:", err);
      toast({ title: "Erreur", description: "Impossible d'envoyer la demande", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusIcon = ({ status }: { status: TierStatus }) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case "pending":
        return <Clock className="w-6 h-6 text-amber-500" />;
      case "locked":
        return <Lock className="w-6 h-6 text-muted-foreground/40" />;
      case "available":
        return <div className="w-6 h-6 rounded-full border-2 border-primary" />;
    }
  };

  const statusLabel = (status: TierStatus) => {
    switch (status) {
      case "completed": return "Complété";
      case "pending": return "En attente de vérification";
      case "locked": return "Requiert l'étape précédente";
      case "available": return "Disponible";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg glass-strong max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Vérification de propriété
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            VIN: <span className="vin-code">{vin}</span>
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {/* ─── TIER 1 ─── */}
            <TierBlock
              tierNumber={1}
              title="Certificat d'immatriculation"
              description="Prouve que vous êtes le propriétaire enregistré"
              badge={tierBadges[0]}
              status={tier1Status}
              StatusIcon={StatusIcon}
              statusLabel={statusLabel}
            >
              {tier1Status === "available" && (
                <div className="space-y-3 mt-3">
                  <FileUploadField
                    file={certificateFile}
                    onFileChange={handleFileUpload(setCertificateFile)}
                    onRemove={() => setCertificateFile(null)}
                    icon={<FileText className="w-5 h-5 text-muted-foreground" />}
                    label="Téléverser le certificat"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <Button
                    onClick={handleSubmitTier1}
                    disabled={!certificateFile || isSubmitting}
                    className="w-full"
                    size="sm"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Envoyer le certificat
                  </Button>
                </div>
              )}
            </TierBlock>

            {/* Connector line */}
            <div className="flex items-center pl-[19px]">
              <div className={`w-0.5 h-6 ${tier1Status === "completed" ? "bg-emerald-500/50" : "bg-border"}`} />
            </div>

            {/* ─── TIER 2 ─── */}
            <TierBlock
              tierNumber={2}
              title="Photo de la plaque VIN"
              description="Confirme que vous avez accès physique au véhicule"
              badge={tierBadges[1]}
              status={tier2Status}
              StatusIcon={StatusIcon}
              statusLabel={statusLabel}
            >
              {tier2Status === "available" && (
                <div className="space-y-3 mt-3">
                  <FileUploadField
                    file={vinPlateFile}
                    onFileChange={handleFileUpload(setVinPlateFile)}
                    onRemove={() => setVinPlateFile(null)}
                    icon={<Camera className="w-5 h-5 text-muted-foreground" />}
                    label="Téléverser la photo de la plaque VIN"
                    accept=".jpg,.jpeg,.png"
                  />
                  <Button
                    onClick={handleSubmitTier2}
                    disabled={!vinPlateFile || isSubmitting}
                    className="w-full"
                    size="sm"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Envoyer la photo
                  </Button>
                </div>
              )}
            </TierBlock>

            {/* Connector line */}
            <div className="flex items-center pl-[19px]">
              <div className={`w-0.5 h-6 ${tier2Status === "completed" ? "bg-emerald-500/50" : "bg-border"}`} />
            </div>

            {/* ─── TIER 3 ─── */}
            <TierBlock
              tierNumber={3}
              title="Chaîne de confiance"
              description="Un ancien propriétaire confirme la transaction"
              badge={tierBadges[2]}
              status={tier3Status}
              StatusIcon={StatusIcon}
              statusLabel={statusLabel}
            >
              {tier3Status === "available" && (
                <div className="space-y-3 mt-3">
                  <Label className="text-sm">Rechercher l'ancien propriétaire</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nom d'utilisateur..."
                      value={formerOwnerSearch}
                      onChange={(e) => setFormerOwnerSearch(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={searchFormerOwners}
                      disabled={formerOwnerSearch.length < 2 || isSearching}
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      {searchResults.map((user) => (
                        <button
                          key={user.user_id}
                          type="button"
                          onClick={() => {
                            setSelectedFormerOwner({ user_id: user.user_id, username: user.username });
                            setSearchResults([]);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center gap-2 text-sm border-b border-border/50 last:border-0"
                        >
                          <UserCheck className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{user.display_name || user.username}</span>
                          {user.username && <span className="text-muted-foreground">@{user.username}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedFormerOwner && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
                      <Link2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">@{selectedFormerOwner.username}</span>
                      <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => setSelectedFormerOwner(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={handleSubmitTier3}
                    disabled={!selectedFormerOwner || isSubmitting}
                    className="w-full"
                    size="sm"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                    Envoyer la demande de confirmation
                  </Button>
                </div>
              )}
            </TierBlock>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground pt-2">
          🔒 Tous les documents restent strictement confidentiels et ne sont jamais publiés.
        </p>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Sub-components ─── */

function TierBlock({
  tierNumber,
  title,
  description,
  badge,
  status,
  StatusIcon,
  statusLabel,
  children,
}: {
  tierNumber: number;
  title: string;
  description: string;
  badge: string;
  status: TierStatus;
  StatusIcon: React.FC<{ status: TierStatus }>;
  statusLabel: (s: TierStatus) => string;
  children?: React.ReactNode;
}) {
  const isDisabled = status === "locked";

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      status === "completed"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : status === "pending"
          ? "border-amber-500/30 bg-amber-500/5"
          : status === "available"
            ? "border-primary/30 bg-primary/5"
            : "border-border/50 bg-muted/20 opacity-60"
    }`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <StatusIcon status={status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-semibold text-sm ${isDisabled ? "text-muted-foreground" : "text-foreground"}`}>
              Tier {tierNumber} — {title}
            </h4>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
              status === "completed" ? "border-emerald-500/50 text-emerald-600" : "border-border text-muted-foreground"
            }`}>
              {badge}
            </Badge>
          </div>
          <p className={`text-xs mt-0.5 ${isDisabled ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
            {description}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${
            status === "completed" ? "text-emerald-600"
              : status === "pending" ? "text-amber-600"
                : status === "available" ? "text-primary"
                  : "text-muted-foreground/50"
          }`}>
            {statusLabel(status)}
          </p>
          {!isDisabled && children}
        </div>
      </div>
    </div>
  );
}

function FileUploadField({
  file,
  onFileChange,
  onRemove,
  icon,
  label,
  accept,
}: {
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  icon: React.ReactNode;
  label: string;
  accept: string;
}) {
  if (file) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} Ko</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={onRemove}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-3 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/10">
      {icon}
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">PDF, JPG, PNG (max 10 Mo)</p>
      </div>
      <input type="file" accept={accept} onChange={onFileChange} className="hidden" />
    </label>
  );
}
