import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Adresse email invalide");
const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Erreur de connexion",
              description: "Email ou mot de passe incorrect.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erreur",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Connexion réussie",
            description: "Bienvenue sur VINmunity !",
          });
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Compte existant",
              description: "Un compte existe déjà avec cette adresse email.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erreur",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Inscription réussie",
            description: "Bienvenue dans la communauté VINmunity !",
          });
        }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Back button */}
      <div className="relative z-10 p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <Shield className="w-12 h-12 text-primary transition-transform group-hover:scale-110" />
              <span className="font-display text-3xl font-bold">
                <span className="text-gradient">VIN</span>
                <span className="text-foreground">munity</span>
              </span>
            </Link>
            <p className="mt-4 text-muted-foreground">
              {isLogin 
                ? "Connectez-vous pour accéder à votre espace" 
                : "Rejoignez la communauté et partagez vos connaissances"}
            </p>
          </div>

          {/* Auth Card */}
          <div className="card-glass p-8">
            {/* Tab Switch */}
            <div className="flex mb-8 p-1 bg-muted/30 rounded-xl">
              <button
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  isLogin 
                    ? "bg-background text-foreground shadow-lg" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIsLogin(true)}
              >
                Connexion
              </button>
              <button
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  !isLogin 
                    ? "bg-background text-foreground shadow-lg" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIsLogin(false)}
              >
                Inscription
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name (signup only) */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-foreground">
                    Nom d'affichage
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Votre nom"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-11"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
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
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    className={`pl-11 ${errors.email ? 'border-danger' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-danger">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    className={`pl-11 pr-11 ${errors.password ? 'border-danger' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-danger">{errors.password}</p>
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
                    {isLogin ? "Connexion..." : "Inscription..."}
                  </span>
                ) : (
                  isLogin ? "Se connecter" : "Créer mon compte"
                )}
              </Button>
            </form>

            {/* Benefits for signup */}
            {!isLogin && (
              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-4">
                  En créant un compte, vous pourrez :
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Contribuer des avis et photos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Gagner des points et badges
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Sauvegarder vos recherches
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Accéder aux rapports Premium
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Footer text */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            En continuant, vous acceptez nos{" "}
            <Link to="/terms" className="text-primary hover:underline">
              conditions d'utilisation
            </Link>{" "}
            et notre{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
