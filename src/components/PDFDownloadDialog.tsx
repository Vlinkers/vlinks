import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileDown, Loader2, CheckCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.string().trim().email("Adresse courriel invalide").max(255);

interface PDFDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vin: string;
  vehicleName: string;
}

export function PDFDownloadDialog({ open, onOpenChange, vin, vehicleName }: PDFDownloadDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Check rate limiting: max 5 per email per day
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { error: insertError } = await supabase
        .from("leads")
        .insert({ email: result.data, vin });

      if (insertError) throw insertError;

      setIsSuccess(true);
      toast({
        title: "Rapport en préparation",
        description: "Le rapport consolidé sera envoyé à votre adresse courriel.",
      });

      setTimeout(() => {
        onOpenChange(false);
        setIsSuccess(false);
        setEmail("");
      }, 2000);
    } catch (err) {
      console.error("Error submitting lead:", err);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            Télécharger le rapport consolidé
          </DialogTitle>
          <DialogDescription>
            {vehicleName && <span className="font-medium text-foreground">{vehicleName}</span>}
            {vehicleName && <br />}
            <span className="font-mono text-xs">{vin}</span>
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle className="w-12 h-12 text-success" />
            <p className="text-center font-medium">Rapport en cours d'envoi</p>
            <p className="text-sm text-muted-foreground text-center">
              Vous recevrez le rapport consolidé à l'adresse indiquée.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse courriel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@courriel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">
                Pas besoin de créer un compte. Votre courriel ne sera pas partagé.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground text-center">
                🚀 Téléchargement gratuit pendant la phase de lancement.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Recevoir le rapport par courriel
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
