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
  ThumbsDown,
  MessageSquare
} from "lucide-react";

// Mock data for demonstration
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
  riskScore: 82,
  communityContributions: 7,
  sellerRating: 4.2,
  lastUpdated: "Il y a 3 jours",
  priceHistory: [
    { date: "Oct 2024", price: "$34,900" },
    { date: "Nov 2024", price: "$33,500" },
    { date: "Déc 2024", price: "$32,900" },
  ],
  inspections: [
    {
      date: "15 Nov 2024",
      inspector: "AutoCheck Pro",
      status: "Passé",
      summary: "Véhicule en excellent état général. Freins à 70%, pneus à 60%.",
      verified: true,
    },
    {
      date: "3 Oct 2024",
      inspector: "Garage Lapointe",
      status: "Passé",
      summary: "Entretien régulier effectué. Aucun problème majeur détecté.",
      verified: true,
    },
  ],
  reviews: [
    {
      author: "Marc T.",
      date: "20 Nov 2024",
      rating: 5,
      text: "Excellent véhicule, le vendeur était honnête sur tout. Transaction parfaite.",
      helpful: 12,
      verified: true,
    },
    {
      author: "Julie L.",
      date: "5 Nov 2024",
      rating: 4,
      text: "Bon état général, quelques rayures mineures non mentionnées mais rien de grave.",
      helpful: 8,
      verified: true,
    },
  ],
  alerts: [
    { type: "info", message: "1 rappel constructeur effectué en 2023" },
    { type: "warning", message: "3 propriétaires précédents" },
  ],
};

const VINDetail = () => {
  const { vin } = useParams();
  const data = mockVINData;

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-danger";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 80) return "Faible risque";
    if (score >= 60) return "Risque modéré";
    return "Risque élevé";
  };

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
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="verified">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      VIN vérifié
                    </Badge>
                    <Badge variant="info">
                      {data.communityContributions} contributions
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
                    <FileText className="w-4 h-4 mr-2" />
                    Rapport complet
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
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Propriétaires</span>
                  </div>
                  <span className="text-xl font-semibold">3</span>
                </div>
              </div>
            </div>

            {/* Risk Score Card */}
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
                    strokeDasharray={`${(data.riskScore / 100) * 352} 352`}
                    className={getRiskColor(data.riskScore)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-display text-4xl font-bold ${getRiskColor(data.riskScore)}`}>
                    {data.riskScore}
                  </span>
                </div>
              </div>
              <Badge variant={data.riskScore >= 80 ? "verified" : "warning"}>
                {getRiskLabel(data.riskScore)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-4">
                Basé sur {data.communityContributions} contributions vérifiées
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
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Inspections */}
              <div className="p-8 rounded-2xl glass">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-semibold">
                    Rapports d'inspection
                  </h2>
                  <Badge variant="info">{data.inspections.length} rapports</Badge>
                </div>
                <div className="space-y-4">
                  {data.inspections.map((inspection, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{inspection.inspector}</span>
                            {inspection.verified && (
                              <Badge variant="verified" className="text-xs">Vérifié</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {inspection.date}
                            </span>
                          </div>
                        </div>
                        <Badge variant={inspection.status === "Passé" ? "verified" : "warning"}>
                          {inspection.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground/80">
                        {inspection.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Community Reviews */}
              <div className="p-8 rounded-2xl glass">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-semibold">
                    Avis de la communauté
                  </h2>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(data.sellerRating)
                            ? "fill-warning text-warning"
                            : "text-muted"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({data.sellerRating}/5)
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  {data.reviews.map((review, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                            {review.author.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{review.author}</span>
                              {review.verified && (
                                <Badge variant="verified" className="text-xs">Vérifié</Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {review.date}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.rating
                                  ? "fill-warning text-warning"
                                  : "text-muted"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-foreground/80 mb-3">
                        {review.text}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                          {review.helpful} utile
                        </button>
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                          <MessageSquare className="w-4 h-4" />
                          Répondre
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Voir tous les avis
                </Button>
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
                      <span className="text-sm text-muted-foreground">{item.date}</span>
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

              {/* Premium Upsell */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold">
                    Rapport Premium
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Accédez au dossier complet avec l'historique des propriétaires, 
                  documents anonymisés et analyse de risque détaillée.
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Historique complet des propriétaires
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Documents d'inspection anonymisés
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Analyse prédictive des risques
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Score de confiance détaillé
                  </li>
                </ul>
                <Button variant="hero" className="w-full">
                  Obtenir pour 14.99$
                </Button>
              </div>

              {/* Seller Info */}
              <div className="p-6 rounded-2xl glass">
                <h3 className="font-display text-lg font-semibold mb-4">
                  Dernière annonce
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>Montréal, QC</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>Actif depuis 45 jours</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-warning" />
                    <span>Vendeur noté 4.2/5 (12 avis)</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Voir le profil vendeur
                </Button>
              </div>

              {/* Contribute CTA */}
              <div className="p-6 rounded-2xl glass text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-display font-semibold mb-2">
                  Avez-vous des informations?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Partagez votre expérience avec ce véhicule et aidez la communauté.
                </p>
                <Button variant="secondary" className="w-full">
                  Contribuer
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
