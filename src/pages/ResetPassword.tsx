import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import vlinksLogo from "@/assets/vlinks-logo.svg";

const emailSchema = z.string().email("Adresse email invalide");

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string>();
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return;
    }
    
    setIsSubmitting(true);
    setError(undefined);

    try {
      const { data, error } = await supabase.functions.invoke("request-password-reset", {
        body: { email: email.trim().toLowerCase() }
      });

      if (error) {
        toast({
          title: "Erreur",
          description: "Une erreur s'est produite. Veuillez réessayer.",
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Back button */}
      <div className="relative z-10 p-4">
        <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block group">
              <img 
                src={vlinksLogo} 
                alt="VLINKS" 
                className="h-10 md:h-12 w-auto mx-auto transition-transform group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Card */}
          <div className="card-glass p-8">
            {emailSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h2 className="font-display text-2xl font-bold">Email envoyé</h2>
                <p className="text-muted-foreground">
                  Si un compte existe avec cette adresse, vous recevrez un lien pour réinitialiser votre mot de passe.
                </p>
                <p className="text-sm text-muted-foreground">
                  Vérifiez également votre dossier spam. Le lien expire dans 1 heure.
                </p>
                <Link to="/auth">
                  <Button variant="outline" className="mt-4">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="font-display text-2xl font-bold mb-2">Mot de passe oublié ?</h2>
                  <p className="text-muted-foreground">
                    Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">
                      Adresse email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="vous@exemple.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(undefined);
                        }}
                        className={`pl-11 ${error ? 'border-danger' : ''}`}
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-danger">{error}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                        Envoi en cours...
                      </span>
                    ) : (
                      "Envoyer le lien"
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
