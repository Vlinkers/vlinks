import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REPORT_TYPES = [
  { value: "illegal_content", label: "Contenu illicite" },
  { value: "defamation", label: "Diffamation" },
  { value: "privacy_violation", label: "Atteinte à la vie privée" },
  { value: "false_information", label: "Information manifestement fausse" },
  { value: "harassment", label: "Harcèlement" },
  { value: "copyright", label: "Violation de droit d'auteur" },
  { value: "other", label: "Autre" },
] as const;

interface ReportContentButtonProps {
  targetType: "fact" | "event" | "red_flag" | "evidence";
  targetId: string;
  vinId?: string;
  variant?: "icon" | "text";
}

export function ReportContentButton({
  targetType,
  targetId,
  vinId,
  variant = "icon",
}: ReportContentButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setReportType("");
    setDescription("");
    setEmail("");
    setName("");
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!reportType || description.trim().length < 20) return;
    if (!user && !email.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("content_reports").insert({
        reporter_user_id: user?.id ?? null,
        reporter_email: user ? null : email.trim(),
        reporter_name: user ? null : name.trim() || null,
        report_type: reportType,
        target_type: targetType,
        target_id: targetId,
        vin_id: vinId ?? null,
        description: description.trim(),
      });

      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast.error("Erreur lors de l'envoi du signalement.");
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = reportType && description.trim().length >= 20 && (user || email.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button
            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
            title="Signaler ce contenu"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5">
            <Flag className="w-3.5 h-3.5" />
            Signaler
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler ce contenu</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm text-foreground font-medium">
              Votre signalement a été enregistré.
            </p>
            <p className="text-xs text-muted-foreground">
              Il sera examiné dans les meilleurs délais.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium mb-2 block">Type de signalement</Label>
              <RadioGroup value={reportType} onValueChange={setReportType} className="space-y-2">
                {REPORT_TYPES.map((t) => (
                  <div key={t.value} className="flex items-center gap-2">
                    <RadioGroupItem value={t.value} id={`report-${t.value}`} />
                    <Label htmlFor={`report-${t.value}`} className="text-sm cursor-pointer">
                      {t.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="report-desc" className="text-sm font-medium mb-1 block">
                Description <span className="text-muted-foreground font-normal">(min. 20 caractères)</span>
              </Label>
              <Textarea
                id="report-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le problème et pourquoi ce contenu devrait être retiré..."
                className="min-h-[100px]"
                maxLength={2000}
              />
              {description.length > 0 && description.length < 20 && (
                <p className="text-xs text-destructive mt-1">
                  {20 - description.length} caractères restants
                </p>
              )}
            </div>

            {!user && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Vous n'êtes pas connecté. Veuillez fournir un courriel pour le suivi.
                </p>
                <div>
                  <Label htmlFor="report-email" className="text-sm font-medium mb-1 block">
                    Courriel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="report-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@courriel.com"
                    maxLength={255}
                  />
                </div>
                <div>
                  <Label htmlFor="report-name" className="text-sm font-medium mb-1 block">
                    Nom <span className="text-muted-foreground font-normal">(optionnel)</span>
                  </Label>
                  <Input
                    id="report-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    maxLength={100}
                  />
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!isValid || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Envoi en cours…" : "Envoyer le signalement"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
