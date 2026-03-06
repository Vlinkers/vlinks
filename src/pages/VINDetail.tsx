import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LaunchBanner from "@/components/LaunchBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContributionForm } from "@/components/ContributionForm";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { PhotoGallery } from "@/components/PhotoGallery";
import { UsernameRequiredDialog } from "@/components/UsernameRequiredDialog";
import { PDFDownloadDialog } from "@/components/PDFDownloadDialog";
import { useVINData, type ContributionType } from "@/hooks/useVINData";
import { useVINDecode } from "@/hooks/useVINDecode";
import { VehicleIdentificationCard } from "@/components/VehicleIdentificationCard";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Car, 
  Calendar, 
  Users,
  FileText,
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
  Loader2,
  User,
  Gauge,
  Fuel,
  Settings,
  FileDown
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getContributionIcon = (type: ContributionType) => {
  switch (type) {
    case "inspection_report": return FileSearch;
    case "vehicle_history": return FileText;
    case "owner_exchange": return MessageCircle;
    case "mechanic_conversation": return Wrench;
    case "photo_evidence": return Camera;
    case "observation": return Eye;
    case "purchase_decision": return XCircle;
    default: return FileText;
  }
};

const getContributionLabel = (type: ContributionType) => {
  switch (type) {
    case "inspection_report": return "Rapport d'inspection";
    case "vehicle_history": return "Historique véhicule";
    case "owner_exchange": return "Échange avec vendeur";
    case "mechanic_conversation": return "Avis mécanicien";
    case "photo_evidence": return "Preuves photo";
    case "observation": return "Observation personnelle";
    case "purchase_decision": return "Décision d'achat";
    default: return "Contribution";
  }
};

const getContributionColor = (type: ContributionType) => {
  switch (type) {
    case "inspection_report": return "bg-primary/20 text-primary border-primary/30";
    case "vehicle_history": return "bg-secondary/20 text-secondary border-secondary/30";
    case "owner_exchange": return "bg-accent/20 text-accent border-accent/30";
    case "mechanic_conversation": return "bg-warning/20 text-warning border-warning/30";
    case "photo_evidence": return "bg-success/20 text-success border-success/30";
    case "observation": return "bg-danger/20 text-danger border-danger/30";
    case "purchase_decision": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
};



const VINDetail = () => {
  const { vin } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useVINData(vin);
  const { data: vinDecode, isLoading: isDecodingVIN } = useVINDecode(vin);
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<ContributionType | "all">("all");
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  
  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState<'none' | 'pending' | 'verified' | 'rejected'>('none');
  const [isCheckingOwner, setIsCheckingOwner] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userHasUsername, setUserHasUsername] = useState(true);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [isEndingOwnership, setIsEndingOwnership] = useState(false);

  useEffect(() => {
    const checkUserAndOwnerStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(null);
        setUserHasUsername(true);
        setIsCheckingOwner(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      const hasValidUsername = !!(profile?.username && profile.username.length >= 3);
      setUserHasUsername(hasValidUsername);

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

  const handleEndOwnership = async () => {
    if (!currentUserId || !data?.id) return;
    
    setIsEndingOwnership(true);
    try {
      await supabase
        .from('raw_contributions')
        .update({ is_former_owner: true })
        .eq('user_id', currentUserId)
        .eq('vin_id', data.id)
        .eq('is_owner_contribution', true);

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
        description: "Votre statut de propriétaire a été mis à jour.",
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

  const handleContributeClick = () => {
    if (!currentUserId) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/vin/${vin}`);
      return;
    }
    if (!userHasUsername) {
      setShowUsernameDialog(true);
      return;
    }
    setShowContributionForm(true);
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

  const vehicleName = vinDecode?.is_valid 
    ? [vinDecode.model_year, vinDecode.make, vinDecode.model, vinDecode.trim].filter(Boolean).join(' ')
    : data ? [data.year, data.make, data.model].filter(Boolean).join(' ') : "";

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LaunchBanner />
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
        <LaunchBanner />
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

  // VIN not found - show empty state with contribute CTA
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <LaunchBanner />
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-mono">{vin}</span>
            </div>

            <div className="max-w-3xl mx-auto">
              <VehicleIdentificationCard
                vin={vin || ""}
                vinDecode={vinDecode}
                isLoading={isDecodingVIN}
                onContribute={handleContributeClick}
              />
              
              <div className="text-center mb-6 p-6 rounded-2xl glass border border-border/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="text-left">
                    <h1 className="font-display text-xl md:text-2xl font-bold">
                      Ce VIN n'a pas encore de dossier
                    </h1>
                    <p className="font-mono text-sm text-muted-foreground">{vin}</p>
                  </div>
                  <Button size="default" variant="hero" onClick={handleContributeClick}>
                    <Plus className="w-4 h-4 mr-2" />
                    {currentUserId ? "Ajouter une contribution" : "Se connecter pour contribuer"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-left">
                  Les contributions sont revues et validées manuellement par VLINKS.
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground text-center px-4">
                  Si personne ne contribue, l'information disparaît à nouveau.<br />
                  Votre expérience peut éviter une inspection inutile au prochain acheteur.
                </p>

                <div className="bg-muted/30 rounded-xl p-5 text-left">
                  <h2 className="font-display text-base font-semibold mb-3">
                    Pourquoi contribuer ?
                  </h2>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li>• Sans contribution, chaque acheteur repart de zéro</li>
                    <li>• La même inspection est souvent payée plusieurs fois</li>
                    <li>• L'information disparaît dès que l'achat est abandonné</li>
                  </ul>
                </div>

                {!currentUserId && (
                  <div className="bg-muted/30 rounded-xl p-5 text-center">
                    <p className="text-muted-foreground mb-3">
                      Les contributions nécessitent un compte utilisateur.<br />
                      Cela permet d'assurer la qualité et la traçabilité des informations.
                    </p>
                    <Button variant="outline" asChild>
                      <Link to={`/auth?redirect=/vin/${vin}`}>Créer un compte gratuit</Link>
                    </Button>
                  </div>
                )}

                {currentUserId && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setShowOwnerForm(true)}
                      className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                    >
                      Vous êtes le propriétaire ? Revendiquer ce VIN (beta)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />

        {currentUserId && (
          <>
            <ContributionForm
              vinId={null}
              vin={vin || ""}
              open={showContributionForm}
              onOpenChange={setShowContributionForm}
            />
            <OwnerClaimForm
              vinId={null}
              vin={vin || ""}
              open={showOwnerForm}
              onOpenChange={setShowOwnerForm}
            />
          </>
        )}
      </div>
    );
  }

  const contributions = data.contributions;
  const filteredContributions = filterType === "all" 
    ? contributions 
    : contributions.filter(c => c.type === filterType);

  const allContributionTypes: { type: ContributionType | "all"; label: string; count: number }[] = [
    { type: "all", label: "Tout", count: contributions.length },
    { type: "inspection_report", label: "Inspections", count: contributions.filter(c => c.type === "inspection_report").length },
    { type: "vehicle_history", label: "Historique", count: contributions.filter(c => c.type === "vehicle_history").length },
    { type: "owner_exchange", label: "Échanges", count: contributions.filter(c => c.type === "owner_exchange").length },
    { type: "mechanic_conversation", label: "Mécanicien", count: contributions.filter(c => c.type === "mechanic_conversation").length },
    { type: "photo_evidence", label: "Photos", count: contributions.filter(c => c.type === "photo_evidence").length },
    { type: "observation", label: "Observations", count: contributions.filter(c => c.type === "observation").length },
    { type: "purchase_decision", label: "Décisions", count: contributions.filter(c => c.type === "purchase_decision").length },
  ];
  
  const contributionTypesFiltered = allContributionTypes.filter(t => t.type === "all" || t.count > 0);

  return (
    <div className="min-h-screen bg-background">
      <LaunchBanner />
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-mono">{vin}</span>
          </div>

          {/* Vehicle Identification Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <VehicleIdentificationCard
                vin={vin || ""}
                vinDecode={vinDecode}
                isLoading={isDecodingVIN}
                dossier={{
                  totalContributions: data.totalContributions,
                  documentCount: data.contributions.reduce((acc, c) => acc + c.documentCount, 0),
                  photoCount: data.contributions.reduce((acc, c) => acc + c.photoCount, 0),
                }}
                lastUpdated={data.lastUpdated}
                onContribute={handleContributeClick}
              />

              {/* Action buttons */}
              <div className="flex gap-3 mb-6">
                {data.totalContributions > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowPDFDialog(true)}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Rapport PDF
                  </Button>
                )}
                <Button variant="hero" size="sm" onClick={handleContributeClick}>
                  <Plus className="w-4 h-4 mr-2" />
                  Contribuer
                </Button>
              </div>
            </div>

            {/* Trust Score Card */}
            <div className="p-8 rounded-2xl glass text-center h-fit">
              <h3 className="font-display text-lg font-semibold mb-4">Score de confiance</h3>
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none"
                    strokeDasharray={`${(data.trustScore / 100) * 352} 352`}
                    className={getTrustColor(data.trustScore)} strokeLinecap="round" />
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
                Basé sur {data.totalContributions} contribution{data.totalContributions > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Owner status (logged in only) */}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'none' && (
            <div className="mb-4 text-right">
              <button onClick={() => setShowOwnerForm(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                Vous êtes le propriétaire ? Revendiquer ce VIN (beta)
              </button>
            </div>
          )}
          
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'verified' && (
            <div className="mb-4 p-3 rounded-xl bg-success/5 border border-success/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-success font-medium">Propriétaire vérifié</span>
              </div>
              <button onClick={handleEndOwnership} disabled={isEndingOwnership}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                {isEndingOwnership ? <Loader2 className="w-3 h-3 animate-spin" /> : "Révoquer"}
              </button>
            </div>
          )}
          
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'pending' && (
            <div className="mb-4 p-3 rounded-xl bg-warning/5 border border-warning/20 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-warning">Vérification propriétaire en cours</span>
            </div>
          )}

          {/* CONTRIBUTIONS - ALWAYS VISIBLE (no auth gating) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Truth Chain Header */}
              <div className="p-6 rounded-2xl glass">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-primary" />
                      Dossier communautaire
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Contributions revues et validées manuellement par VLINKS.
                    </p>
                  </div>
                  <Button variant="hero" size="sm" onClick={handleContributeClick}>
                    <Plus className="w-4 h-4 mr-2" />
                    Contribuer
                  </Button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 flex-wrap">
                  {contributionTypesFiltered.map((ct) => (
                    <button key={ct.type} onClick={() => setFilterType(ct.type)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        filterType === ct.type
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}>
                      {ct.label}
                      <span className="ml-1.5 opacity-70">({ct.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              {filteredContributions.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent opacity-30" />
                  <div className="space-y-4">
                    {filteredContributions.map((contribution, index) => {
                      const Icon = getContributionIcon(contribution.type);
                      return (
                        <div key={contribution.id} className="relative pl-16 animate-fade-in-up"
                          style={{ animationDelay: `${index * 0.05}s` }}>
                          <div className={`absolute left-3 w-6 h-6 rounded-full flex items-center justify-center border-2 ${getContributionColor(contribution.type)}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="p-5 rounded-xl glass border border-border/50 hover:border-primary/30 transition-all">
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

                            {contribution.summaryPublic && (
                              <p className="text-sm text-foreground/90 mb-3">{contribution.summaryPublic}</p>
                            )}

                            {contribution.photos.length > 0 && (
                              <div className="mb-3">
                                <PhotoGallery photos={contribution.photos} />
                              </div>
                            )}

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
                    Vous avez de l'information sur ce véhicule ?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Chaque détail compte. Vos observations, photos, ou échanges peuvent aider le prochain acheteur.
                  </p>
                  {!currentUserId && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Les contributions nécessitent un compte utilisateur pour assurer la qualité et la traçabilité.
                    </p>
                  )}
                  <Button variant="hero" onClick={handleContributeClick}>
                    <Plus className="w-4 h-4 mr-2" />
                    {currentUserId ? "Ajouter ma contribution" : "Se connecter pour contribuer"}
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
              </div>

              {/* Download Report CTA */}
              {data.totalContributions > 0 && (
                <div className="p-6 rounded-2xl glass">
                  <h3 className="font-display text-lg font-semibold mb-2 flex items-center gap-2">
                    <FileDown className="w-5 h-5 text-primary" />
                    Rapport consolidé
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Téléchargez un rapport PDF regroupant toutes les contributions de ce dossier.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setShowPDFDialog(true)}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Télécharger le rapport
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    🚀 Gratuit pendant le lancement
                  </p>
                </div>
              )}

              {/* Contribute CTA */}
              <div className="p-6 rounded-2xl glass border-2 border-dashed border-secondary/30">
                <h3 className="font-display text-lg font-semibold mb-2">
                  Contribuer à ce dossier
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Vos inspections, photos et observations aident d'autres acheteurs à prendre de meilleures décisions.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Contribuez anonymement si désiré</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Contributions validées manuellement</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4" onClick={handleContributeClick}>
                  <Plus className="w-4 h-4 mr-2" />
                  {currentUserId ? "Ajouter ma contribution" : "Se connecter pour contribuer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <UsernameRequiredDialog 
        open={showUsernameDialog} 
        onComplete={() => {
          setShowUsernameDialog(false);
          setUserHasUsername(true);
          setShowContributionForm(true);
        }} 
      />

      {currentUserId && (
        <>
          <ContributionForm
            vinId={data.id}
            vin={vin || ""}
            open={showContributionForm}
            onOpenChange={setShowContributionForm}
            onSuccess={() => refetch()}
          />
          <OwnerClaimForm
            vinId={data.id}
            vin={vin || ""}
            open={showOwnerForm}
            onOpenChange={setShowOwnerForm}
            onSuccess={() => refetch()}
          />
        </>
      )}

      <PDFDownloadDialog
        open={showPDFDialog}
        onOpenChange={setShowPDFDialog}
        vin={vin || ""}
        vehicleName={vehicleName}
      />
    </div>
  );
};

export default VINDetail;
