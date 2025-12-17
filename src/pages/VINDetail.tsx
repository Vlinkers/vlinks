import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContributionForm } from "@/components/ContributionForm";
import { PhotoGallery } from "@/components/PhotoGallery";
import { useVINData, type ContributionType } from "@/hooks/useVINData";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Car, 
  Calendar, 
  Users, 
  Star,
  FileText,
  Lock,
  ChevronRight,
  ExternalLink,
  Clock,
  ThumbsUp,
  Camera,
  FileSearch,
  MessageCircle,
  Wrench,
  XCircle,
  Eye,
  Link2,
  Plus,
  ChevronDown,
  Loader2
} from "lucide-react";
import { useState } from "react";

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

const VINDetail = () => {
  const { vin } = useParams();
  const { data, isLoading, error } = useVINData(vin);
  const [expandedContribution, setExpandedContribution] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ContributionType | "all">("all");
  const [showContributionForm, setShowContributionForm] = useState(false);

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

  // VIN not found - show empty state with contribution CTA
  if (!data) {
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
              <span className="text-foreground font-mono">{vin}</span>
            </div>

            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <Car className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-2">
                Ce VIN n'a pas encore de dossier
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Soyez le premier à ne pas laisser l'information disparaître.
              </p>
              <p className="font-mono text-base text-muted-foreground mb-6">{vin}</p>
              <p className="text-muted-foreground mb-8">
                Vous avez inspecté, observé ou échangé à propos de ce véhicule ?<br />
                Cette information a de la valeur — pour vous aujourd'hui, et pour les autres demain.
              </p>

              {/* Pourquoi contribuer maintenant */}
              <div className="bg-muted/30 rounded-xl p-6 mb-6 text-left">
                <h2 className="font-display text-lg font-semibold mb-4">
                  Pourquoi contribuer maintenant ?
                </h2>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li>• Sans contribution, chaque acheteur repart de zéro</li>
                  <li>• La même inspection est souvent payée plusieurs fois</li>
                  <li>• L'information disparaît dès que l'achat est abandonné</li>
                </ul>
                <p className="mt-4 text-sm font-medium text-foreground">
                  Votre contribution empêche ce gaspillage collectif.
                </p>
              </div>

              {/* Ce que vous gagnez */}
              <div className="bg-muted/30 rounded-xl p-6 mb-8 text-left">
                <h2 className="font-display text-lg font-semibold mb-4">
                  Ce que vous gagnez en contribuant
                </h2>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Des crédits VLINKS pour consulter d'autres dossiers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Une preuve de transparence si vous revendez ce véhicule</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>La reconnaissance de la communauté</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Une contribution anonyme, modérée et sans risque</span>
                  </li>
                </ul>
              </div>

              <Button variant="hero" size="lg" onClick={() => setShowContributionForm(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Créer le premier maillon
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Contribution gratuite • Anonyme • Réversible
              </p>
            </div>
          </div>
        </main>
        <Footer />

        <ContributionForm
          vinId={null}
          vin={vin || ""}
          open={showContributionForm}
          onOpenChange={setShowContributionForm}
        />
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
                    {data.year ? `${data.year} ` : ""}{data.make || ""} {data.model || "Véhicule"}
                  </h1>
                  <p className="text-muted-foreground font-mono text-lg">
                    {vin}
                  </p>
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

          {/* Content Grid */}
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

                          {/* Contribution Card */}
                          <div className="p-5 rounded-xl glass border border-border/50 hover:border-primary/30 transition-all">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <Badge variant="outline" className={`text-xs ${getContributionColor(contribution.type)}`}>
                                    <Icon className="w-3 h-3 mr-1" />
                                    {getContributionLabel(contribution.type)}
                                  </Badge>
                                  {contribution.authorVerified && (
                                    <Badge variant="verified" className="text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Vérifié
                                    </Badge>
                                  )}
                                  {contribution.decision === "purchased" && (
                                    <Badge variant="verified" className="text-xs bg-success/20 text-success border-success/30">
                                      ✓ A acheté
                                    </Badge>
                                  )}
                                  {contribution.decision === "passed" && (
                                    <Badge variant="outline" className="text-xs">
                                      ✗ N'a pas acheté
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-semibold text-foreground mb-1">
                                  {contribution.title}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span>{contribution.author}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {contribution.date}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Summary */}
                            {contribution.summary && (
                              <p className="text-sm text-foreground/80 mb-3">
                                {contribution.summary}
                              </p>
                            )}

                            {/* Pass Reason */}
                            {contribution.passReason && (
                              <div className="p-3 rounded-lg bg-muted/30 mb-3 text-sm">
                                <span className="text-muted-foreground">Raison du refus: </span>
                                <span className="text-foreground">{contribution.passReason}</span>
                              </div>
                            )}

                            {/* Expanded Details */}
                            {isExpanded && contribution.details && (
                              <div className="p-4 rounded-lg bg-muted/20 mb-3 text-sm text-foreground/70 border-l-2 border-primary/50">
                                {contribution.details}
                              </div>
                            )}

                            {/* Photo Gallery */}
                            {contribution.photos.length > 0 && (
                              <div className="mb-3">
                                <PhotoGallery photos={contribution.photos} />
                              </div>
                            )}

                            {/* Tags */}
                            {contribution.tags.length > 0 && (
                              <div className="flex gap-2 flex-wrap mb-3">
                                {contribution.tags.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-full text-xs bg-muted/50 text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
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
                                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                  <ThumbsUp className="w-4 h-4" />
                                  {contribution.helpful}
                                </button>
                                {contribution.details && (
                                  <button
                                    onClick={() => setExpandedContribution(isExpanded ? null : contribution.id)}
                                    className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                                  >
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    {isExpanded ? "Moins" : "Plus"}
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
                    <span className="text-sm text-muted-foreground">Décisions partagées</span>
                    <span className="font-semibold">{contributions.filter(c => c.decision !== null).length}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-muted-foreground">
                      {contributions.filter(c => c.decision === "purchased").length} ont acheté
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    <span className="text-muted-foreground">
                      {contributions.filter(c => c.decision === "passed").length} ont renoncé
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
                    <Star className="w-4 h-4 text-warning" />
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
        </div>
      </main>

      <Footer />

      <ContributionForm
        vinId={data.id}
        vin={vin || ""}
        open={showContributionForm}
        onOpenChange={setShowContributionForm}
      />
    </div>
  );
};

export default VINDetail;
