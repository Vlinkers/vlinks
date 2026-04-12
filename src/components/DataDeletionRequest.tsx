import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DataDeletionRequest = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from("content_reports").insert({
      reporter_user_id: user.id,
      reporter_email: user.email,
      report_type: "other",
      target_type: "fact",
      target_id: user.id,
      vin_id: null,
      description: `[DEMANDE DE SUPPRESSION DE DONNÉES — Loi 25]\n\nUtilisateur: ${user.email}\nMotif: ${reason || "Aucun motif spécifié"}\n\nL'utilisateur demande la suppression complète de ses données personnelles conformément à la Loi 25 du Québec (droit à l'oubli).`,
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr"
          ? "Impossible d'envoyer la demande. Réessayez plus tard."
          : "Could not submit request. Try again later.",
        variant: "destructive",
      });
    } else {
      setSubmitted(true);
      toast({
        title: language === "fr" ? "Demande envoyée" : "Request sent",
        description: language === "fr"
          ? "Votre demande sera traitée dans les meilleurs délais."
          : "Your request will be processed shortly.",
      });
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-medium">
              {language === "fr"
                ? "Votre demande de suppression a été enregistrée. Vous serez contacté par courriel."
                : "Your deletion request has been recorded. You will be contacted by email."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="w-5 h-5" />
          {language === "fr" ? "Suppression de mes données" : "Delete my data"}
        </CardTitle>
        <CardDescription>
          {language === "fr"
            ? "Conformément à la Loi 25 du Québec, vous pouvez demander la suppression de vos données personnelles. Vos contributions seront anonymisées et vos informations personnelles supprimées."
            : "Under Quebec's Law 25, you can request deletion of your personal data. Your contributions will be anonymized and your personal information removed."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              {language === "fr"
                ? "Cette action est irréversible. Votre compte sera supprimé et vos contributions anonymisées. Les documents de vérification seront détruits."
                : "This action is irreversible. Your account will be deleted and contributions anonymized. Verification documents will be destroyed."}
            </p>
          </div>
        </div>

        <Textarea
          placeholder={language === "fr" ? "Motif de la demande (optionnel)" : "Reason for request (optional)"}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              {language === "fr" ? "Demander la suppression" : "Request deletion"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {language === "fr" ? "Confirmer la suppression" : "Confirm deletion"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {language === "fr"
                  ? "Êtes-vous sûr de vouloir demander la suppression de toutes vos données ? Cette action est irréversible."
                  : "Are you sure you want to request deletion of all your data? This action is irreversible."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {language === "fr" ? "Annuler" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {language === "fr" ? "Confirmer la suppression" : "Confirm deletion"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default DataDeletionRequest;
