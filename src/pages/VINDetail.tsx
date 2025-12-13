import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Car, 
  Calendar, 
  Gauge, 
  Users, 
  Star,
  FileText,
  Lock,
  ChevronRight,
  ExternalLink,
  TrendingUp,
  MapPin,
  Clock,
  ThumbsUp,
  MessageSquare,
  Camera,
  AlertCircle,
  FileSearch,
  MessageCircle,
  Wrench,
  XCircle,
  Eye,
  Link2,
  Plus,
  ChevronDown
} from "lucide-react";
import { useState } from "react";

// Contribution types for the truth aggregation layer
type ContributionType = 
  | "inspection_report"
  | "vehicle_history"
  | "owner_exchange"
  | "mechanic_conversation"
  | "photo_evidence"
  | "personal_observation"
  | "purchase_decision";

interface Contribution {
  id: string;
  type: ContributionType;
  date: string;
  author: string;
  authorVerified: boolean;
  title: string;
  summary: string;
  details?: string;
  rating?: number;
  helpful: number;
  hasDocuments: boolean;
  documentCount?: number;
  hasPhotos: boolean;
  photoCount?: number;
  tags: string[];
  decision?: "purchased" | "passed" | null;
  passReason?: string;
}

// Mock data representing cumulative truth about a VIN
const mockVINData = {
  vin: "WVWZZZ3CZWE123456",
  make: "Volkswagen",
  model: "Golf GTI",
  year: 2023,
  trim: "Autobahn",
  color: "Tornado Red",
  engine: "2.0L TSI Turbo",
  transmission: "DSG 7-Speed",
  drivetrain: "FWD",
  mileage: "28,500 km",
  trustScore: 82,
  totalContributions: 12,
  uniqueContributors: 8,
  lastUpdated: "Il y a 3 jours",
  priceHistory: [
    { date: "Oct 2024", price: "$34,900", source: "Marketplace" },
    { date: "Nov 2024", price: "$33,500", source: "Dealer" },
    { date: "Déc 2024", price: "$32,900", source: "Kijiji" },
  ],
  alerts: [
    { type: "info", message: "1 rappel constructeur effectué en 2023" },
    { type: "warning", message: "3 propriétaires en 2 ans" },
  ],
  contributions: [
    {
      id: "1",
      type: "inspection_report" as ContributionType,
      date: "15 Nov 2024",
      author: "Marc T.",
      authorVerified: true,
      title: "Inspection pré-achat complète",
      summary: "Inspection réalisée chez AutoCheck Pro. Véhicule en excellent état général. Freins avant à 70%, pneus à 60%. Aucune rouille, carrosserie impeccable.",
      details: "Le technicien a noté une légère usure sur les disques arrière mais rien d'urgent. Huile changée récemment. Tous les liquides OK.",
      rating: 5,
      helpful: 24,
      hasDocuments: true,
      documentCount: 2,
      hasPhotos: true,
      photoCount: 8,
      tags: ["Inspection professionnelle", "État excellent"],
      decision: "purchased" as const,
    },
    {
      id: "2",
      type: "owner_exchange" as ContributionType,
      date: "12 Nov 2024",
      author: "Julie L.",
      authorVerified: true,
      title: "Échange avec le vendeur - réponses honnêtes",
      summary: "Le vendeur a été transparent sur l'historique. Véhicule utilisé principalement pour trajets quotidiens. Jamais accidenté. Entretien toujours fait chez le concessionnaire.",
      details: "Il m'a fourni toutes les factures d'entretien sans hésitation. A mentionné un petit accrochage de stationnement (réparé sous garantie). Négociation difficile mais fair.",
      helpful: 18,
      hasDocuments: true,
      documentCount: 5,
      hasPhotos: false,
      photoCount: 0,
      tags: ["Vendeur transparent", "Historique complet"],
      decision: "passed" as const,
      passReason: "Prix trop élevé pour mon budget",
    },
    {
      id: "3",
      type: "vehicle_history" as ContributionType,
      date: "10 Nov 2024",
      author: "Alex M.",
      authorVerified: true,
      title: "Rapport Carfax - historique propre",
      summary: "J'ai acheté un rapport Carfax pour ce VIN. Aucun accident déclaré, 3 propriétaires, entretien régulier documenté.",
      details: "Le rapport montre des changements d'huile réguliers tous les 8-10k km. Dernière inspection SAAQ sans problème. Un seul rappel constructeur (airbag) effectué en 2023.",
      helpful: 31,
      hasDocuments: true,
      documentCount: 1,
      hasPhotos: false,
      photoCount: 0,
      tags: ["Carfax", "Sans accident", "Entretien régulier"],
      decision: null,
    },
    {
      id: "4",
      type: "mechanic_conversation" as ContributionType,
      date: "8 Nov 2024",
      author: "Pierre D.",
      authorVerified: false,
      title: "Avis de mon mécanicien de confiance",
      summary: "J'ai fait voir le véhicule à mon garagiste. Il a noté que les DSG à ce kilométrage nécessitent une vidange prochaine (~$400). Sinon, mécanique saine.",
      details: "Il recommande de négocier la vidange DSG dans le prix ou de prévoir ce coût. Pas de fuite d'huile, turbo semble OK, pas de bruit suspect.",
      helpful: 15,
      hasDocuments: false,
      documentCount: 0,
      hasPhotos: false,
      photoCount: 0,
      tags: ["Avis mécanicien", "DSG", "Entretien à prévoir"],
      decision: "passed" as const,
      passReason: "J'ai trouvé une meilleure offre ailleurs",
    },
    {
      id: "5",
      type: "photo_evidence" as ContributionType,
      date: "5 Nov 2024",
      author: "Sophie R.",
      authorVerified: true,
      title: "Photos détaillées sous le véhicule",
      summary: "J'ai pris des photos du dessous du véhicule sur un lift. Aucune trace de rouille, échappement en bon état, aucune fuite visible.",
      helpful: 22,
      hasDocuments: false,
      documentCount: 0,
      hasPhotos: true,
      photoCount: 12,
      tags: ["Photos", "Sous-carrosserie", "Sans rouille"],
      decision: null,
    },
    {
      id: "6",
      type: "personal_observation" as ContributionType,
      date: "2 Nov 2024",
      author: "Michel B.",
      authorVerified: true,
      title: "⚠️ Attention - traces de réparation sur aile avant",
      summary: "Lors de mon essai, j'ai remarqué une légère différence de texture de peinture sur l'aile avant droite. Probablement une retouche après un accrochage mineur.",
      details: "J'ai mesuré l'épaisseur avec un gauge et elle était légèrement supérieure à l'original sur cette zone. Le vendeur n'a pas mentionné ce détail initialement.",
      helpful: 28,
      hasDocuments: false,
      documentCount: 0,
      hasPhotos: true,
      photoCount: 4,
      tags: ["Retouche peinture", "Red flag", "Non déclaré"],
      decision: "passed" as const,
      passReason: "Manque de transparence du vendeur",
    },
    {
      id: "7",
      type: "purchase_decision" as ContributionType,
      date: "28 Oct 2024",
      author: "François G.",
      authorVerified: true,
      title: "J'ai décidé de ne pas acheter - voici pourquoi",
      summary: "Après inspection et négociation, j'ai renoncé. Le vendeur refusait de baisser le prix malgré la vidange DSG à faire et les traces de retouche découvertes.",
      details: "Le véhicule est correct mais le rapport qualité/prix n'était pas au rendez-vous vu les défauts cachés. Je recommande de négocier fort si intéressé.",
      helpful: 19,
      hasDocuments: false,
      documentCount: 0,
      hasPhotos: false,
      photoCount: 0,
      tags: ["Décision d'achat", "Négociation échouée", "Conseil"],
      decision: "passed" as const,
      passReason: "Rapport qualité/prix insuffisant",
    },
  ] as Contribution[],
};

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
    case "personal_observation":
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
    case "personal_observation":
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
    case "personal_observation":
      return "bg-danger/20 text-danger border-danger/30";
    case "purchase_decision":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const VINDetail = () => {
  const { vin } = useParams();
  const data = mockVINData;
  const [expandedContribution, setExpandedContribution] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ContributionType | "all">("all");

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

  const filteredContributions = filterType === "all" 
    ? data.contributions 
    : data.contributions.filter(c => c.type === filterType);

  const allContributionTypes: { type: ContributionType | "all"; label: string; count: number }[] = [
    { type: "all" as const, label: "Tout", count: data.contributions.length },
    { type: "inspection_report" as const, label: "Inspections", count: data.contributions.filter(c => c.type === "inspection_report").length },
    { type: "vehicle_history" as const, label: "Historique", count: data.contributions.filter(c => c.type === "vehicle_history").length },
    { type: "owner_exchange" as const, label: "Échanges", count: data.contributions.filter(c => c.type === "owner_exchange").length },
    { type: "mechanic_conversation" as const, label: "Mécanicien", count: data.contributions.filter(c => c.type === "mechanic_conversation").length },
    { type: "photo_evidence" as const, label: "Photos", count: data.contributions.filter(c => c.type === "photo_evidence").length },
    { type: "personal_observation" as const, label: "Observations", count: data.contributions.filter(c => c.type === "personal_observation").length },
    { type: "purchase_decision" as const, label: "Décisions", count: data.contributions.filter(c => c.type === "purchase_decision").length },
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
                    {data.year} {data.make} {data.model}
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
                  <Button variant="hero" size="sm">
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
                  <span className="text-xl font-semibold">{data.year}</span>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Gauge className="w-4 h-4" />
                    <span className="text-sm">Kilométrage</span>
                  </div>
                  <span className="text-xl font-semibold">{data.mileage}</span>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Car className="w-4 h-4" />
                    <span className="text-sm">Transmission</span>
                  </div>
                  <span className="text-xl font-semibold">{data.transmission}</span>
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

          {/* Alerts */}
          {data.alerts.length > 0 && (
            <div className="space-y-3 mb-8">
              {data.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-xl ${
                    alert.type === "warning"
                      ? "bg-warning/10 border border-warning/30"
                      : "bg-primary/10 border border-primary/30"
                  }`}
                >
                  {alert.type === "warning" ? (
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                  ) : (
                    <Shield className="w-5 h-5 text-primary shrink-0" />
                  )}
                  <span className={alert.type === "warning" ? "text-warning" : "text-primary"}>
                    {alert.message}
                  </span>
                </div>
              ))}
            </div>
          )}

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
                  <Button variant="hero" size="sm">
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
                            {contribution.rating && (
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < contribution.rating!
                                        ? "fill-warning text-warning"
                                        : "text-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Summary */}
                          <p className="text-sm text-foreground/80 mb-3">
                            {contribution.summary}
                          </p>

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
                                  {contribution.documentCount} doc{contribution.documentCount! > 1 ? "s" : ""}
                                </span>
                              )}
                              {contribution.hasPhotos && (
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Camera className="w-4 h-4" />
                                  {contribution.photoCount} photo{contribution.photoCount! > 1 ? "s" : ""}
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
                  <Button variant="hero">
                    <Plus className="w-4 h-4 mr-2" />
                    Devenir un maillon de la chaîne
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Price History */}
              <div className="p-6 rounded-2xl glass">
                <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Historique des prix
                </h3>
                <div className="space-y-3">
                  {data.priceHistory.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <span className="text-sm text-muted-foreground">{item.date}</span>
                        <span className="text-xs text-muted-foreground/70 block">{item.source}</span>
                      </div>
                      <span className="font-semibold">{item.price}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Variation</span>
                    <span className="text-success font-semibold">-$2,000 (5.7%)</span>
                  </div>
                </div>
              </div>

              {/* Contribution Stats */}
              <div className="p-6 rounded-2xl glass">
                <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-secondary" />
                  Résumé des contributions
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Inspections pro</span>
                    <span className="font-semibold">{data.contributions.filter(c => c.type === "inspection_report").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rapports historique</span>
                    <span className="font-semibold">{data.contributions.filter(c => c.type === "vehicle_history").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Observations terrain</span>
                    <span className="font-semibold">{data.contributions.filter(c => c.type === "personal_observation" || c.type === "photo_evidence").length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Décisions partagées</span>
                    <span className="font-semibold">{data.contributions.filter(c => c.decision !== null).length}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-muted-foreground">
                      {data.contributions.filter(c => c.decision === "purchased").length} ont acheté
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    <span className="text-muted-foreground">
                      {data.contributions.filter(c => c.decision === "passed").length} ont renoncé
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
                  Vous êtes le prochain maillon. Partagez votre expérience, 
                  vos photos, ou vos échanges sur ce véhicule.
                </p>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Contribuer maintenant
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VINDetail;
