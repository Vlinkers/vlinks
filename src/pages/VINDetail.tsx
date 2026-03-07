import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LaunchBanner from "@/components/LaunchBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContributionForm } from "@/components/ContributionForm";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { UsernameRequiredDialog } from "@/components/UsernameRequiredDialog";
import { PDFDownloadDialog } from "@/components/PDFDownloadDialog";
import { useVINData, type ContributionType } from "@/hooks/useVINData";
import { useVINDecode } from "@/hooks/useVINDecode";
import { VehicleIdentificationCard } from "@/components/VehicleIdentificationCard";
import { ContributionCard, getContributionIcon, getContributionLabel, getContributionColor } from "@/components/ContributionCard";
import { useVINFollow } from "@/hooks/useVINFollow";
import { useAdmin } from "@/hooks/useAdmin";
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
  EyeOff,
  Link2,
  Plus,
  Loader2,
  User,
  Gauge,
  Fuel,
  Settings,
  FileDown,
  Star,
  Trash2,
  Pencil
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";




const VINDetail = () => {
  const { vin } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useVINData(vin);
  const { data: vinDecode, isLoading: isDecodingVIN } = useVINDecode(vin);
  const { toast } = useToast();
  const { isAdmin, logAction } = useAdmin();
  const { isFollowing, isLoading: isFollowLoading, toggleFollow } = useVINFollow(vin);
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

  const handleFollowClick = async () => {
    if (!currentUserId) {
      navigate(`/auth?redirect=/vin/${vin}`);
      return;
    }
    const success = await toggleFollow();
    if (success) {
      toast({
        title: isFollowing ? "VIN retiré" : "VIN suivi",
        description: isFollowing 
          ? "Vous ne suivez plus ce VIN." 
          : "Vous recevrez les mises à jour pour ce VIN.",
      });
    }
  };

  const handleAdminAction = async (contributionId: string, action: string) => {
    const statusMap: Record<string, string> = {
      approve: "approved",
      hide: "hidden",
      delete: "deleted",
    };
    const newStatus = statusMap[action];
    if (!newStatus) return;

    const { error } = await (supabase
      .from("public_contributions")
      .update({ status: newStatus } as any)
      .eq("id", contributionId) as any);

    if (!error) {
      await logAction(`contribution_${newStatus}`, "contribution", contributionId);
      toast({ title: action === "approve" ? "Contribution approuvée" : action === "hide" ? "Contribution masquée" : "Contribution supprimée" });
      refetch();
    }
  };

  const AdminActions = ({ contributionId }: { contributionId: string }) => {
    if (!isAdmin) return null;
    return (
      <div className="flex gap-1 mt-2">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleAdminAction(contributionId, "hide"); }}>
          <EyeOff className="w-3 h-3 mr-1" /> Masquer
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-danger" onClick={(e) => { e.stopPropagation(); handleAdminAction(contributionId, "delete"); }}>
          <Trash2 className="w-3 h-3 mr-1" /> Supprimer
        </Button>
      </div>
    );
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
            showContributeButton={false}
          />

          {/* ═══ TABLEAU DE BORD — Score + Aperçu ═══ */}
          <div className="rounded-2xl glass border border-border/50 overflow-hidden mb-8">
            <div className="p-6 pb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Tableau de bord</h2>
              {data.lastUpdated && (
                <span className="text-xs text-muted-foreground ml-auto">Mis à jour : {data.lastUpdated}</span>
              )}
            </div>

            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {/* Trust Score */}
                <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-muted/30 flex flex-col items-center justify-center">
                  <div className="relative w-20 h-20 mb-2">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" />
                      <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="none"
                        strokeDasharray={`${(data.trustScore / 100) * 213.6} 213.6`}
                        className={getTrustColor(data.trustScore)} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`font-display text-2xl font-bold ${getTrustColor(data.trustScore)}`}>
                        {data.trustScore}
                      </span>
                    </div>
                  </div>
                  <Badge variant={data.trustScore >= 80 ? "verified" : "warning"} className="text-[10px]">
                    {getTrustLabel(data.trustScore)}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">Score de confiance</p>
                </div>

                <div className="p-4 rounded-xl bg-muted/30 flex flex-col items-center justify-center text-center">
                  <FileText className="w-5 h-5 text-primary mb-1" />
                  <span className="font-display text-2xl font-bold text-foreground">{contributions.length}</span>
                  <p className="text-xs text-muted-foreground mt-1">Contributions</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 flex flex-col items-center justify-center text-center">
                  <FileSearch className="w-5 h-5 text-primary mb-1" />
                  <span className="font-display text-2xl font-bold text-foreground">
                    {contributions.filter(c => c.type === "inspection_report").length}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Inspections</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 flex flex-col items-center justify-center text-center">
                  <FileText className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="font-display text-2xl font-bold text-foreground">
                    {contributions.reduce((acc, c) => acc + c.documentCount, 0)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Documents</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 flex flex-col items-center justify-center text-center">
                  <Camera className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="font-display text-2xl font-bold text-foreground">
                    {contributions.reduce((acc, c) => acc + c.photoCount, 0)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Photos</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex flex-wrap gap-3 border-t border-border/30 pt-4">
              <Button 
                variant={isFollowing ? "default" : "outline"} 
                size="sm" 
                onClick={handleFollowClick}
                disabled={isFollowLoading}
              >
                <Star className={`w-4 h-4 mr-2 ${isFollowing ? "fill-current" : ""}`} />
                {isFollowing ? "VIN suivi" : "Suivre ce VIN"}
              </Button>
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
              {isAdmin && (
                <Button variant="outline" size="sm" asChild className="border-primary/30 text-primary">
                  <Link to="/admin/contributions">
                    <Shield className="w-4 h-4 mr-2" />
                    Modérer
                  </Link>
                </Button>
              )}
              <p className="w-full text-xs text-muted-foreground mt-1">
                Contributions revues et validées manuellement par VLINKS.
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


          {/* ═══ INSPECTIONS & DOCUMENTS ═══ */}
          {contributions.filter(c => c.type === "inspection_report" || c.type === "vehicle_history" || c.type === "mechanic_conversation").length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
                <FileSearch className="w-5 h-5 text-primary" />
                Rapports & Documents
              </h2>
              <div className="space-y-3">
                {contributions
                  .filter(c => c.type === "inspection_report" || c.type === "vehicle_history" || c.type === "mechanic_conversation")
                  .map((contribution) => {
                    const Icon = getContributionIcon(contribution.type);
                    return (
                      <div key={contribution.id} className="p-5 rounded-xl glass border border-border/50">
                        <div className="flex items-start justify-between">
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
                            {contribution.title && (
                              <h3 className="text-sm font-semibold text-foreground mt-2">{contribution.title}</h3>
                            )}
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span>{contribution.author}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {contribution.interventionDate || contribution.date}
                              </span>
                              {contribution.mileageAtIntervention && (
                                <>
                                  <span>•</span>
                                  <span>{contribution.mileageAtIntervention.toLocaleString()} km</span>
                                </>
                              )}
                            </div>
                            {contribution.summaryPublic && (
                              <p className="text-sm text-foreground/90 mt-2">{contribution.summaryPublic}</p>
                            )}
                          </div>
                        </div>
                        {(contribution.hasDocuments || contribution.hasPhotos) && (
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
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
                        )}
                        <AdminActions contributionId={contribution.id} />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ═══ OBSERVATIONS ═══ */}
          {contributions.filter(c => c.type === "observation" || c.type === "owner_exchange" || c.type === "purchase_decision").length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-accent" />
                Observations des acheteurs
              </h2>
              <div className="space-y-3">
                {contributions
                  .filter(c => c.type === "observation" || c.type === "owner_exchange" || c.type === "purchase_decision")
                  .map((contribution) => {
                    const Icon = getContributionIcon(contribution.type);
                    return (
                      <div key={contribution.id} className="p-5 rounded-xl glass border border-border/50">
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
                        </div>
                        {contribution.title && (
                          <h3 className="text-sm font-semibold text-foreground mt-2">{contribution.title}</h3>
                        )}
                        {contribution.summaryPublic && (
                          <blockquote className="text-sm text-foreground/90 border-l-2 border-primary/30 pl-3 my-2 italic">
                            {contribution.summaryPublic}
                          </blockquote>
                        )}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                          <span>{contribution.author}</span>
                          <span>•</span>
                          <span>{contribution.date}</span>
                          {contribution.authorVerified && (
                            <>
                              <span>•</span>
                              <span className="text-success flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Contribution validée
                              </span>
                            </>
                          )}
                        </div>
                        <AdminActions contributionId={contribution.id} />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ═══ PHOTOS ═══ */}
          {contributions.some(c => c.photos.length > 0) && (
            <div className="mb-8">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5 text-secondary" />
                Photos
              </h2>
              <div className="space-y-4">
                {contributions
                  .filter(c => c.photos.length > 0)
                  .map((contribution) => (
                    <div key={contribution.id} className="p-4 rounded-xl glass border border-border/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <span>{contribution.author}</span>
                        <span>•</span>
                        <span>{contribution.date}</span>
                      </div>
                      <PhotoGallery photos={contribution.photos} />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ═══ TIMELINE CHRONOLOGIQUE ═══ */}
          <div className="mb-8">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Historique des contributions
            </h2>

            {contributions.length > 0 ? (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent opacity-30" />
                <div className="space-y-3">
                  {contributions.map((contribution, index) => {
                    const Icon = getContributionIcon(contribution.type);
                    return (
                      <div key={contribution.id} className="relative pl-16 animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.05}s` }}>
                        <div className={`absolute left-3 w-6 h-6 rounded-full flex items-center justify-center border-2 ${getContributionColor(contribution.type)}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="p-4 rounded-xl glass border border-border/50">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${getContributionColor(contribution.type)}`}>
                              {getContributionLabel(contribution.type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{contribution.author}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{contribution.date}</span>
                            {contribution.mileageAtIntervention && (
                              <span className="text-xs text-muted-foreground">
                                • {contribution.mileageAtIntervention.toLocaleString()} km
                              </span>
                            )}
                          </div>
                          <AdminActions contributionId={contribution.id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl glass text-center">
                <p className="text-muted-foreground">
                  Aucune contribution pour ce VIN. Soyez le premier à contribuer !
                </p>
              </div>
            )}
          </div>

          {/* ═══ FINAL CTA ═══ */}
          <div className="p-8 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 text-center mb-8">
            <h3 className="font-display text-xl font-semibold mb-2">
              Vous avez de l'information sur ce véhicule ?
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
              Chaque détail compte. Vos observations, photos, ou échanges peuvent aider le prochain acheteur.
            </p>
            {!currentUserId && (
              <p className="text-xs text-muted-foreground mb-4">
                Les contributions nécessitent un compte utilisateur pour assurer la qualité et la traçabilité.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" onClick={handleContributeClick}>
                <Plus className="w-4 h-4 mr-2" />
                {currentUserId ? "Ajouter ma contribution" : "Se connecter pour contribuer"}
              </Button>
              {data.totalContributions > 0 && (
                <Button variant="outline" size="lg" onClick={() => setShowPDFDialog(true)}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Rapport PDF
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">🚀 Gratuit pendant le lancement</p>
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
