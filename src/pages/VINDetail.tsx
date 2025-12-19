import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContributionForm } from "@/components/ContributionForm";
import { OwnerContributionForm } from "@/components/OwnerContributionForm";
import { OwnerVerificationForm } from "@/components/OwnerVerificationForm";
import { PhotoGallery } from "@/components/PhotoGallery";
import { useVINData, type ContributionType } from "@/hooks/useVINData";
import { useVINDecode } from "@/hooks/useVINDecode";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Car, 
  Calendar, 
  Users,
  FileText,
  Lock,
  ChevronRight,
  ExternalLink,
  Clock,
  Camera,
  FileSearch,
  MessageCircle,
  Wrench,
  XCircle,
  Eye,
  Link2,
  Plus,
  ChevronDown,
  Loader2,
  User,
  Gauge,
  Fuel,
  Settings
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getContributionIcon = (type: ContributionType) => {
  switch (type) {
    case "inspection_report":
      return FileSearch;
    case "vehicle_history":
      return FileText;
    case "owner_exchange":
      return MessageCircle;
    case "mechanic_conversation":
      return Wrench;
    case "photo_evidence":
      return Camera;
    case "observation":
      return Eye;
    case "purchase_decision":
      return XCircle;
    default:
      return FileText;
  }
};

const getContributionLabel = (type: ContributionType) => {
  switch (type) {
    case "inspection_report":
      return "Rapport d'inspection";
    case "vehicle_history":
      return "Historique véhicule";
    case "owner_exchange":
      return "Échange avec vendeur";
    case "mechanic_conversation":
      return "Avis mécanicien";
    case "photo_evidence":
      return "Preuves photo";
    case "observation":
      return "Observation personnelle";
    case "purchase_decision":
      return "Décision d'achat";
    default:
      return "Contribution";
  }
};

const getContributionColor = (type: ContributionType) => {
  switch (type) {
    case "inspection_report":
      return "bg-primary/20 text-primary border-primary/30";
    case "vehicle_history":
      return "bg-secondary/20 text-secondary border-secondary/30";
    case "owner_exchange":
      return "bg-accent/20 text-accent border-accent/30";
    case "mechanic_conversation":
      return "bg-warning/20 text-warning border-warning/30";
    case "photo_evidence":
      return "bg-success/20 text-success border-success/30";
    case "observation":
      return "bg-danger/20 text-danger border-danger/30";
    case "purchase_decision":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

// Vehicle Detected Block Component
interface VehicleDetectedBlockProps {
  vinDecode: {
    make: string | null;
    model: string | null;
    model_year: number | null;
    trim: string | null;
    engine: string | null;
    body_class: string | null;
    drive_type: string | null;
    fuel_type: string | null;
    is_valid: boolean;
    error_message: string | null;
  } | null | undefined;
  isLoading: boolean;
}

const VehicleDetectedBlock = ({ vinDecode, isLoading }: VehicleDetectedBlockProps) => {
  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50 mb-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          <span className="text-sm text-muted-foreground">Identification du véhicule...</span>
        </div>
      </div>
    );
  }

  if (!vinDecode) {
    return null;
  }

  if (!vinDecode.is_valid) {
    return (
      <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 mb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-danger">VIN non reconnu</p>
            <p className="text-sm text-muted-foreground">
              {vinDecode.error_message || "Ce VIN ne correspond pas à un véhicule valide ou n'est pas reconnu par la base NHTSA."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const vehicleName = [
    vinDecode.model_year,
    vinDecode.make,
    vinDecode.model,
    vinDecode.trim
  ].filter(Boolean).join(' ');

  return (
    <div className="p-4 rounded-xl bg-success/10 border border-success/30 mb-4">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-success mb-1">Véhicule détecté</p>
          <p className="font-display text-lg font-semibold text-foreground truncate">
            {vehicleName || "Véhicule identifié"}
          </p>
          
          {/* Vehicle details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {vinDecode.body_class && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Car className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{vinDecode.body_class}</span>
              </div>
            )}
            {vinDecode.engine && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{vinDecode.engine}</span>
              </div>
            )}
            {vinDecode.fuel_type && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Fuel className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{vinDecode.fuel_type}</span>
              </div>
            )}
            {vinDecode.drive_type && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Gauge className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{vinDecode.drive_type}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const VINDetail = () => {
  const { vin } = useParams();
  const { data, isLoading, error, refetch } = useVINData(vin);
  const { data: vinDecode, isLoading: isDecodingVIN } = useVINDecode(vin);
  const { toast } = useToast();
  const [expandedContribution, setExpandedContribution] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ContributionType | "all">("all");
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [isOwnerClaim, setIsOwnerClaim] = useState(false);
  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState<'none' | 'pending' | 'verified' | 'rejected'>('none');
  const [isCheckingOwner, setIsCheckingOwner] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEndingOwnership, setIsEndingOwnership] = useState(false);

  // Check user and owner verification status
  useEffect(() => {
    const checkUserAndOwnerStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(null);
        setIsCheckingOwner(false);
        return;
      }

      setCurrentUserId(user.id);

      // If we have a VIN record, check owner verification status (only active, not ended)
      if (data?.id) {
        const { data: verification } = await supabase
          .from('owner_verifications')
          .select('verification_status, ended_at')
          .eq('user_id', user.id)
          .eq('vin_id', data.id)
          .is('ended_at', null)
          .maybeSingle();

        if (verification) {
          setOwnerVerificationStatus(verification.verification_status as any);
        } else {
          setOwnerVerificationStatus('none');
        }
      }
      
      setIsCheckingOwner(false);
    };

    checkUserAndOwnerStatus();
  }, [data?.id]);

  // Handle ending ownership
  const handleEndOwnership = async () => {
    if (!currentUserId || !data?.id) return;
    
    setIsEndingOwnership(true);
    try {
      // Update existing contributions to mark as former owner
      await supabase
        .from('raw_contributions')
        .update({ is_former_owner: true })
        .eq('user_id', currentUserId)
        .eq('vin_id', data.id)
        .eq('is_owner_contribution', true);

      // End the ownership verification (mark with ended_at)
      const { error } = await supabase
        .from('owner_verifications')
        .update({ ended_at: new Date().toISOString() })
        .eq('user_id', currentUserId)
        .eq('vin_id', data.id)
        .is('ended_at', null);

      if (error) throw error;

      setOwnerVerificationStatus('none');
      
      toast({
        title: "Propriété terminée",
        description: "Votre statut de propriétaire a été mis à jour. Vos contributions passées restent visibles comme 'ancien propriétaire'.",
      });
      
      refetch();
    } catch (error) {
      console.error("Error ending ownership:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setIsEndingOwnership(false);
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-danger";
  };

  const getTrustLabel = (score: number) => {
    if (score >= 80) return "Haute confiance";
    if (score >= 60) return "Confiance modérée";
    return "Confiance faible";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Chargement des données...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[50vh]">
            <AlertTriangle className="w-12 h-12 text-danger mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">Erreur de chargement</h2>
            <p className="text-muted-foreground">Une erreur est survenue lors du chargement des données.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // VIN not found - show empty state 
  // GATING: Si non connecté, afficher uniquement VIN decode + CTA login
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:text-foreground transition-colors">
                Accueil
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-mono">{vin}</span>
            </div>

            <div className="max-w-3xl mx-auto">
              {/* Bloc véhicule détecté */}
              <VehicleDetectedBlock vinDecode={vinDecode} isLoading={isDecodingVIN} />
              
              {/* BLOC D'ACTION PRINCIPAL */}
              <div className="text-center mb-6 p-6 rounded-2xl glass border border-border/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="text-left">
                    <h1 className="font-display text-xl md:text-2xl font-bold">
                      Ce VIN n'a pas encore de dossier
                    </h1>
                    <p className="font-mono text-sm text-muted-foreground">{vin}</p>
                  </div>
                  
                  {/* GATING: Comportement différent selon connexion */}
                  {currentUserId ? (
                    <Button 
                      size="default"
                      variant="hero"
                      onClick={() => setShowContributionForm(true)}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Ajouter un maillon
                    </Button>
                  ) : (
                    <Button 
                      size="default"
                      variant="hero"
                      asChild
                    >
                      <Link to="/auth">
                        <User className="w-4 h-4 mr-2" />
                        Se connecter pour contribuer
                      </Link>
                    </Button>
                  )}
                </div>
                
                {/* Sous-texte seulement si connecté */}
                {currentUserId && (
                  <p className="text-xs text-muted-foreground mt-3 text-left">
                    Votre contribution est analysée et reformulée automatiquement avant publication.
                  </p>
                )}
              </div>

              {/* GATING: Contenu explicatif seulement si connecté */}
              {currentUserId ? (
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground text-center px-4">
                    Si personne ne contribue, l'information disparaît à nouveau.<br />
                    Votre expérience peut éviter une inspection inutile au prochain acheteur.
                  </p>

                  {/* Pourquoi contribuer */}
                  <div className="bg-muted/30 rounded-xl p-5 text-left">
                    <h2 className="font-display text-base font-semibold mb-3">
                      Pourquoi contribuer maintenant ?
                    </h2>
                    <ul className="space-y-1.5 text-muted-foreground">
                      <li>• Sans contribution, chaque acheteur repart de zéro</li>
                      <li>• La même inspection est souvent payée plusieurs fois</li>
                      <li>• L'information disparaît dès que l'achat est abandonné</li>
                    </ul>
                  </div>

                  {/* Ce que vous gagnez */}
                  <div className="bg-muted/30 rounded-xl p-5 text-left">
                    <h2 className="font-display text-base font-semibold mb-3">
                      Ce que vous gagnez en contribuant
                    </h2>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>Des crédits VLINKS pour consulter d'autres dossiers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>Une preuve de transparence si vous revendez ce véhicule</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>La reconnaissance de la communauté</span>
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Anonyme • Gratuit • Sans engagement
                    </p>
                  </div>

                  {/* Lien discret propriétaire (beta) */}
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setShowOwnerForm(true)}
                      className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                    >
                      Vous êtes le propriétaire ? Revendiquer ce VIN (beta)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground text-center px-4">
                    Connectez-vous pour voir les contributions existantes ou ajouter votre expérience avec ce véhicule.
                  </p>
                  
                  <div className="bg-muted/30 rounded-xl p-5 text-center">
                    <h2 className="font-display text-base font-semibold mb-3">
                      La vérité est une chaîne
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      Chaque contribution ajoute un maillon de confiance pour les futurs acheteurs.
                    </p>
                    <Button variant="outline" asChild>
                      <Link to="/auth">
                        Créer un compte gratuit
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />

        {/* Popup contributeur - seulement si connecté */}
        {currentUserId && (
          <ContributionForm
            vinId={null}
            vin={vin || ""}
            open={showContributionForm}
            onOpenChange={setShowContributionForm}
          />
        )}

        {/* Popup propriétaire (beta, discret) - seulement si connecté */}
        {currentUserId && (
          <OwnerVerificationForm
            vinId={null}
            vin={vin || ""}
            open={showOwnerForm}
            onOpenChange={setShowOwnerForm}
          />
        )}
      </div>
    );
  }

  const contributions = data.contributions;
  const filteredContributions = filterType === "all" 
    ? contributions 
    : contributions.filter(c => c.type === filterType);

  const allContributionTypes: { type: ContributionType | "all"; label: string; count: number }[] = [
    { type: "all" as const, label: "Tout", count: contributions.length },
    { type: "inspection_report" as const, label: "Inspections", count: contributions.filter(c => c.type === "inspection_report").length },
    { type: "vehicle_history" as const, label: "Historique", count: contributions.filter(c => c.type === "vehicle_history").length },
    { type: "owner_exchange" as const, label: "Échanges", count: contributions.filter(c => c.type === "owner_exchange").length },
    { type: "mechanic_conversation" as const, label: "Mécanicien", count: contributions.filter(c => c.type === "mechanic_conversation").length },
    { type: "photo_evidence" as const, label: "Photos", count: contributions.filter(c => c.type === "photo_evidence").length },
    { type: "observation" as const, label: "Observations", count: contributions.filter(c => c.type === "observation").length },
    { type: "purchase_decision" as const, label: "Décisions", count: contributions.filter(c => c.type === "purchase_decision").length },
  ];
  
  const contributionTypes = allContributionTypes.filter(t => t.type === "all" || t.count > 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link to="/" className="hover:text-foreground transition-colors">
              Accueil
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/search" className="hover:text-foreground transition-colors">
              Recherche
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-mono">{vin}</span>
          </div>

          {/* Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Vehicle Info Card */}
            <div className="lg:col-span-2 p-8 rounded-2xl glass">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Badge variant="verified">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      VIN vérifié
                    </Badge>
                    <Badge variant="info">
                      <Link2 className="w-3 h-3 mr-1" />
                      {data.totalContributions} maillons
                    </Badge>
                    <Badge variant="outline">
                      <Users className="w-3 h-3 mr-1" />
                      {data.uniqueContributors} contributeurs
                    </Badge>
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                    {(vinDecode?.model_year || data.year) ? `${vinDecode?.model_year || data.year} ` : ""}
                    {vinDecode?.make || data.make || ""} {vinDecode?.model || data.model || "Véhicule"}
                    {vinDecode?.trim ? ` ${vinDecode.trim}` : ""}
                  </h1>
                  <p className="text-muted-foreground font-mono text-lg">
                    {vin}
                  </p>
                  {/* Additional vehicle details from decode */}
                  {vinDecode?.is_valid && (vinDecode.engine || vinDecode.fuel_type || vinDecode.drive_type) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {vinDecode.engine && (
                        <Badge variant="outline" className="text-xs">
                          <Settings className="w-3 h-3 mr-1" />
                          {vinDecode.engine}
                        </Badge>
                      )}
                      {vinDecode.fuel_type && (
                        <Badge variant="outline" className="text-xs">
                          <Fuel className="w-3 h-3 mr-1" />
                          {vinDecode.fuel_type}
                        </Badge>
                      )}
                      {vinDecode.drive_type && (
                        <Badge variant="outline" className="text-xs">
                          <Gauge className="w-3 h-3 mr-1" />
                          {vinDecode.drive_type}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Partager
                  </Button>
                  <Button variant="hero" size="sm" onClick={() => setShowContributionForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Contribuer
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Année</span>
                  </div>
                  <span className="text-xl font-semibold">{data.year || "—"}</span>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Car className="w-4 h-4" />
                    <span className="text-sm">Marque</span>
                  </div>
                  <span className="text-xl font-semibold">{data.make || "—"}</span>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Car className="w-4 h-4" />
                    <span className="text-sm">Modèle</span>
                  </div>
                  <span className="text-xl font-semibold">{data.model || "—"}</span>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Mis à jour</span>
                  </div>
                  <span className="text-lg font-semibold">{data.lastUpdated}</span>
                </div>
              </div>
            </div>

            {/* Trust Score Card */}
            <div className="p-8 rounded-2xl glass text-center">
              <h3 className="font-display text-lg font-semibold mb-4">
                Score de confiance
              </h3>
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(data.trustScore / 100) * 352} 352`}
                    className={getTrustColor(data.trustScore)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-display text-4xl font-bold ${getTrustColor(data.trustScore)}`}>
                    {data.trustScore}
                  </span>
                </div>
              </div>
              <Badge variant={data.trustScore >= 80 ? "verified" : "warning"}>
                {getTrustLabel(data.trustScore)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-4">
                Basé sur {data.totalContributions} maillons de vérité
              </p>
            </div>
          </div>

          {/* Lien discret propriétaire (beta) - accessible seulement si connecté */}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'none' && (
            <div className="mb-4 text-right">
              <button
                onClick={() => setShowOwnerForm(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Vous êtes le propriétaire ? Revendiquer ce VIN (beta)
              </button>
            </div>
          )}
          
          {/* Status propriétaire (si vérifié ou en attente) - discret */}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'verified' && (
            <div className="mb-4 p-3 rounded-xl bg-success/5 border border-success/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-success font-medium">Propriétaire vérifié</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-success hover:bg-success/10"
                  onClick={() => {
                    setIsOwnerClaim(true);
                    setShowOwnerForm(true);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Contribution propriétaire
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleEndOwnership}
                  disabled={isEndingOwnership}
                >
                  {isEndingOwnership ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'pending' && (
            <div className="mb-4 p-3 rounded-xl bg-warning/5 border border-warning/20 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-warning">Vérification propriétaire en cours</span>
            </div>
          )}

          {/* GATING: Contenu différent selon connexion */}
          {currentUserId ? (
            /* UTILISATEUR CONNECTÉ - Afficher la chaîne complète */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content - Timeline */}
              <div className="lg:col-span-2 space-y-6">
                {/* Truth Chain Header */}
                <div className="p-6 rounded-2xl glass">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-primary" />
                        La chaîne de vérité
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Chaque contribution est un maillon. Ensemble, ils révèlent la réalité.
                      </p>
                    </div>
                    <Button variant="hero" size="sm" onClick={() => setShowContributionForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un maillon
                    </Button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex gap-2 flex-wrap">
                    {contributionTypes.map((ct) => (
                      <button
                        key={ct.type}
                        onClick={() => setFilterType(ct.type)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          filterType === ct.type
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {ct.label}
                        <span className="ml-1.5 opacity-70">({ct.count})</span>
                      </button>
                    ))}
                  </div>
                </div>

              {/* Timeline */}
              {filteredContributions.length > 0 ? (
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent opacity-30" />

                  {/* Contributions */}
                  <div className="space-y-4">
                    {filteredContributions.map((contribution, index) => {
                      const Icon = getContributionIcon(contribution.type);
                      const isExpanded = expandedContribution === contribution.id;

                      return (
                        <div
                          key={contribution.id}
                          className="relative pl-16 animate-fade-in-up"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          {/* Timeline Node */}
                          <div className={`absolute left-3 w-6 h-6 rounded-full flex items-center justify-center border-2 ${getContributionColor(contribution.type)}`}>
                            <Icon className="w-3 h-3" />
                          </div>

                          {/* Contribution Card - AI-processed content only */}
                          <div className="p-5 rounded-xl glass border border-border/50 hover:border-primary/30 transition-all">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <Badge variant="outline" className={`text-xs ${getContributionColor(contribution.type)}`}>
                                    <Icon className="w-3 h-3 mr-1" />
                                    {getContributionLabel(contribution.type)}
                                  </Badge>
                                  {contribution.isOwnerContribution && (
                                    <Badge variant="info" className="text-xs">
                                      <User className="w-3 h-3 mr-1" />
                                      Propriétaire
                                    </Badge>
                                  )}
                                  {contribution.authorVerified && (
                                    <Badge variant="verified" className="text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Vérifié
                                    </Badge>
                                  )}
                                  {/* Risk Level Badge */}
                                  {contribution.riskLevel >= 4 && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Risque élevé
                                    </Badge>
                                  )}
                                  {contribution.riskLevel === 3 && (
                                    <Badge variant="warning" className="text-xs">
                                      Attention requise
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span>{contribution.author}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {contribution.date}
                                  </span>
                                  {contribution.mileageAtIntervention && (
                                    <>
                                      <span>•</span>
                                      <span>{contribution.mileageAtIntervention.toLocaleString()} km</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* AI-Processed Summary - NEVER raw user text */}
                            <p className="text-sm text-foreground/90 mb-3">
                              {contribution.summaryPublic}
                            </p>

                            {/* Source Credibility */}
                            {contribution.sourceCredibility && (
                              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                <span>{contribution.sourceCredibility}</span>
                              </div>
                            )}

                            {/* Technical Findings - Expandable */}
                            {isExpanded && contribution.technicalFindings.length > 0 && (
                              <div className="p-4 rounded-lg bg-muted/20 mb-3 border-l-2 border-primary/50">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Constats techniques</p>
                                <ul className="space-y-1">
                                  {contribution.technicalFindings.map((finding, i) => (
                                    <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                                      <span className="text-primary">•</span>
                                      {finding}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Photo Gallery */}
                            {contribution.photos.length > 0 && (
                              <div className="mb-3">
                                <PhotoGallery photos={contribution.photos} />
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-border/30">
                              <div className="flex items-center gap-4">
                                {contribution.hasDocuments && (
                                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <FileText className="w-4 h-4" />
                                    {contribution.documentCount} doc{contribution.documentCount > 1 ? "s" : ""}
                                  </span>
                                )}
                                {contribution.hasPhotos && (
                                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Camera className="w-4 h-4" />
                                    {contribution.photoCount} photo{contribution.photoCount > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {contribution.technicalFindings.length > 0 && (
                                  <button
                                    onClick={() => setExpandedContribution(isExpanded ? null : contribution.id)}
                                    className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                                  >
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    {isExpanded ? "Moins" : "Détails"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl glass text-center">
                  <p className="text-muted-foreground">
                    {filterType === "all" 
                      ? "Aucune contribution pour ce VIN. Soyez le premier à contribuer!"
                      : "Aucune contribution de ce type."}
                  </p>
                </div>
              )}

              {/* End of Timeline CTA */}
              <div className="pl-16 relative">
                <div className="absolute left-3 w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Plus className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center">
                  <h3 className="font-display font-semibold mb-2">
                    Vous avez de l'information sur ce véhicule?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chaque détail compte. Vos observations, photos, ou échanges peuvent aider le prochain acheteur.
                  </p>
                  <Button variant="hero" onClick={() => setShowContributionForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Devenir un maillon de la chaîne
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contribution Stats */}
              <div className="p-6 rounded-2xl glass">
                <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-secondary" />
                  Résumé des contributions
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Inspections pro</span>
                    <span className="font-semibold">{contributions.filter(c => c.type === "inspection_report").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rapports historique</span>
                    <span className="font-semibold">{contributions.filter(c => c.type === "vehicle_history").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Observations terrain</span>
                    <span className="font-semibold">{contributions.filter(c => c.type === "observation" || c.type === "photo_evidence").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Contributions propriétaire</span>
                    <span className="font-semibold">{contributions.filter(c => c.isOwnerContribution).length}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-muted-foreground">
                      {contributions.filter(c => c.riskLevel <= 2).length} sans problème détecté
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    <span className="text-muted-foreground">
                      {contributions.filter(c => c.riskLevel >= 3).length} points d'attention
                    </span>
                  </div>
                </div>
              </div>

              {/* Premium Upsell */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold">
                    Rapport consolidé
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Obtenez un rapport unifié avec tous les documents, l'analyse de risque 
                  détaillée et les recommandations personnalisées.
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Tous les documents anonymisés
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Synthèse des observations
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Analyse prédictive des risques
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Recommandation d'achat
                  </li>
                </ul>
                <Button variant="hero" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Obtenir le rapport
                </Button>
              </div>

              {/* Contribute CTA */}
              <div className="p-6 rounded-2xl glass border-2 border-dashed border-secondary/30">
                <h3 className="font-display text-lg font-semibold mb-2">
                  La vérité est une chaîne
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Vos inspections, photos et observations aident des milliers d'acheteurs à éviter les pièges.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-warning" />
                    <span>Gagnez des points et badges</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Contribuez anonymement si désiré</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4" onClick={() => setShowContributionForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter ma contribution
                </Button>
              </div>
            </div>
          </div>
          ) : (
            /* UTILISATEUR NON CONNECTÉ - Vue limitée */
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-8 rounded-2xl glass text-center">
                <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="font-display text-xl font-semibold mb-2">
                  Connectez-vous pour accéder à la chaîne de vérité
                </h2>
                <p className="text-muted-foreground mb-6">
                  Ce véhicule possède {data.totalContributions} contribution{data.totalContributions > 1 ? 's' : ''} de la communauté.
                  Connectez-vous pour les consulter et ajouter votre expérience.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="hero" asChild>
                    <Link to="/auth">
                      <User className="w-4 h-4 mr-2" />
                      Se connecter
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/auth">
                      Créer un compte gratuit
                    </Link>
                  </Button>
                </div>
              </div>
              
              {/* Teaser des contributions - sans détails */}
              <div className="p-6 rounded-2xl bg-muted/20 border border-border/50">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  Aperçu du dossier
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-background/50">
                    <span className="text-2xl font-bold text-primary">{data.totalContributions}</span>
                    <p className="text-sm text-muted-foreground">Contributions</p>
                  </div>
                  <div className="p-4 rounded-xl bg-background/50">
                    <span className="text-2xl font-bold text-secondary">{data.uniqueContributors}</span>
                    <p className="text-sm text-muted-foreground">Contributeurs</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Créez un compte gratuit pour voir les détails des contributions
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Formulaires seulement si connecté */}
      {currentUserId && (
        <>
          <ContributionForm
            vinId={data.id}
            vin={vin || ""}
            open={showContributionForm}
            onOpenChange={(open) => {
              setShowContributionForm(open);
              if (!open) setIsOwnerClaim(false);
            }}
            onSuccess={() => refetch()}
            isOwnerClaim={isOwnerClaim}
          />
          <OwnerVerificationForm
            vinId={data.id}
            vin={vin || ""}
            open={showOwnerForm}
            onOpenChange={setShowOwnerForm}
            onSuccess={() => refetch()}
          />
        </>
      )}
    </div>
  );
};

export default VINDetail;
