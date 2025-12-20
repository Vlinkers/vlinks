import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AtSign, Loader2, AlertCircle, Shield } from "lucide-react";
import { validateUsernameFormat, checkUsernameAvailability } from "@/lib/usernameValidation";

interface UsernameRequiredDialogProps {
  open: boolean;
  onComplete: () => void;
}

export function UsernameRequiredDialog({ open, onComplete }: UsernameRequiredDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUsernameChange = (value: string) => {
    // Auto-format: lowercase, only allowed chars
    const formatted = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(formatted);
    
    // Validate on change
    if (formatted.length > 0) {
      const result = validateUsernameFormat(formatted, language as "fr" | "en");
      setError(result.valid ? "" : (result.error || ""));
    } else {
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate format
    const formatResult = validateUsernameFormat(username, language as "fr" | "en");
    if (!formatResult.valid) {
      setError(formatResult.error || "");
      return;
    }

    setIsSubmitting(true);
    setError("");

    // Check availability
    const availabilityResult = await checkUsernameAvailability(username, user.id, language as "fr" | "en");
    if (!availabilityResult.valid) {
      setError(availabilityResult.error || "");
      setIsSubmitting(false);
      return;
    }

    // Save to profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        username: username.trim(),
        updated_at: new Date().toISOString() 
      })
      .eq("user_id", user.id);

    setIsSubmitting(false);

    if (updateError) {
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Impossible de sauvegarder le pseudonyme" 
          : "Failed to save username",
        variant: "destructive",
      });
    } else {
      toast({
        title: language === "fr" ? "Pseudonyme enregistré" : "Username saved",
        description: language === "fr" 
          ? "Vous pouvez maintenant contribuer !" 
          : "You can now contribute!",
      });
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              {language === "fr" ? "Choisissez votre pseudonyme" : "Choose your username"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {language === "fr" 
              ? "Pour protéger votre vie privée, vous devez choisir un pseudonyme public. C'est la seule information visible par les autres utilisateurs." 
              : "To protect your privacy, you must choose a public username. This is the only information visible to other users."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="username-required">
              {language === "fr" ? "Pseudonyme public" : "Public username"} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="username-required"
                type="text"
                placeholder="mon_pseudo"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`pl-11 ${error ? 'border-destructive' : ''}`}
                maxLength={20}
                autoFocus
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {language === "fr" 
                  ? "3-20 caractères. Lettres, chiffres et underscore uniquement." 
                  : "3-20 characters. Letters, numbers, and underscore only."}
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              {language === "fr" 
                ? "Ce pseudonyme sera utilisé pour toutes vos contributions. Il ne peut pas être modifié fréquemment." 
                : "This username will be used for all your contributions. It cannot be changed frequently."}
            </p>
          </div>

          <Button 
            type="submit" 
            variant="hero" 
            className="w-full"
            disabled={isSubmitting || !username || username.length < 3}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === "fr" ? "Enregistrement..." : "Saving..."}
              </span>
            ) : (
              language === "fr" ? "Confirmer mon pseudonyme" : "Confirm my username"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
