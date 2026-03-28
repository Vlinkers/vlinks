import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OwnerClaimFormProps {
  vinId: string | null;
  vin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const documentTypes = [
  { value: "facture", label: "Facture récente", description: "Facture d'entretien ou de réparation" },
  { value: "assurance", label: "Certificat d'assurance", description: "Document d'assurance actif" },
  { value: "carte_grise", label: "Carte grise (masquée)", description: "Carte grise avec informations personnelles masquées" },
  { value: "autre", label: "Autre document", description: "Tout document prouvant la propriété" },
];

export function OwnerClaimForm({
  vinId,
  vin,
  open,
  onOpenChange,
  onSuccess,
}: OwnerClaimFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [document, setDocument] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");

  const handleDocumentUpload = useCallback(
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
        setDocument(file);
      }
    },
    [toast]
  );

  const removeDocument = () => {
    setDocument(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!document || !documentType) {
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
          description: "Vous devez être connecté pour revendiquer ce VIN",
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

      // Check if there's already an active claim for this VIN
      const { data: existingClaim } = await supabase
        .from("owner_claims")
        .select("id, user_id")
        .eq("vin_id", actualVinId)
        .eq("status", "active")
        .maybeSingle();

      if (existingClaim) {
        if (existingClaim.user_id === user.id) {
          toast({
            title: "Déjà revendiqué",
            description: "Vous avez déjà revendiqué ce VIN",
          });
        } else {
          toast({
            title: "VIN déjà revendiqué",
            description: "Ce VIN est déjà revendiqué par un autre utilisateur",
            variant: "destructive",
          });
        }
        return;
      }

      // Upload document to private bucket
      const filePath = buildSafeFilePath(`${user.id}/${actualVinId}`, document.name);
      const { error: uploadError } = await supabase.storage
        .from("owner-verification-docs")
        .upload(filePath, document);

      if (uploadError) {
        throw uploadError;
      }

      // Create owner_claims record
      const { error: claimError } = await supabase
        .from("owner_claims")
        .insert({
          user_id: user.id,
          vin_id: actualVinId,
          status: "active",
        });

      if (claimError) {
        throw claimError;
      }

      // Also create owner_verifications record for backward compatibility
      const { error: verificationError } = await supabase
        .from("owner_verifications")
        .insert({
          user_id: user.id,
          vin_id: actualVinId,
          document_path: filePath,
          document_type: documentType,
          verification_status: "pending",
        });

      if (verificationError && verificationError.code !== "23505") {
        console.error("Error creating verification:", verificationError);
      }

      toast({
        title: "VIN revendiqué",
        description: "Votre demande de propriété a été enregistrée. La vérification est en cours.",
      });

      setDocument(null);
      setDocumentType("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting claim:", error);
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
      <DialogContent className="max-w-lg glass-strong">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Revendiquer ce VIN (beta)
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            VIN: <span className="font-mono">{vin}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Info beta */}
        <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Fonctionnalité en beta</p>
            <p>
              En V1, vous pouvez revendiquer ce VIN pour indiquer que vous en êtes le propriétaire.
              Les contributions propriétaire seront disponibles dans une prochaine version.
            </p>
          </div>
        </div>

        {/* Note de confidentialité */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Document confidentiel
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Votre document est utilisé uniquement pour vérifier votre statut de propriétaire.
                Il n'est jamais publié et reste strictement confidentiel.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Type de document</Label>
            <div className="grid grid-cols-1 gap-2">
              {documentTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setDocumentType(type.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    documentType === type.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground/50 bg-muted/30"
                  }`}
                >
                  <p className={`font-medium text-sm ${
                    documentType === type.value ? "text-primary" : "text-foreground"
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
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Preuve de propriété
            </Label>
            
            {!document ? (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Cliquez pour téléverser
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG (max 10 Mo)
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {document.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(document.size / 1024).toFixed(1)} Ko
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeDocument}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="hero"
            className="w-full"
            disabled={isSubmitting || !document || !documentType}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Revendiquer ce VIN
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            🔒 Document privé • Un seul propriétaire actif par VIN
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
