import { 
  FileSearch, 
  ShieldCheck, 
  Users, 
  Star, 
  FileText, 
  TrendingUp,
  Lock,
  Zap
} from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Recherche par VIN",
    description: "Accédez instantanément à l'historique complet d'un véhicule grâce aux contributions de la communauté.",
    color: "primary",
  },
  {
    icon: ShieldCheck,
    title: "Avis vérifiés",
    description: "Système anti-diffamation et vérification des contributeurs pour garantir la qualité des informations.",
    color: "success",
  },
  {
    icon: Users,
    title: "Communauté active",
    description: "Des milliers d'acheteurs et propriétaires partagent leurs expériences et inspections.",
    color: "secondary",
  },
  {
    icon: Star,
    title: "Notes vendeurs",
    description: "Évaluez et consultez les notes des vendeurs particuliers et professionnels.",
    color: "warning",
  },
  {
    icon: FileText,
    title: "Rapports Premium",
    description: "Obtenez un dossier consolidé complet avec analyse technique et scoring de risque.",
    color: "accent",
  },
  {
    icon: TrendingUp,
    title: "Suivi des annonces",
    description: "Historique des prix, durée en vente, modifications - détectez les anomalies.",
    color: "primary",
  },
  {
    icon: Lock,
    title: "Données anonymisées",
    description: "Les informations personnelles sont automatiquement masquées pour protéger la vie privée.",
    color: "danger",
  },
  {
    icon: Zap,
    title: "Inspecteurs certifiés",
    description: "Marketplace d'inspecteurs locaux vérifiés pour des inspections professionnelles.",
    color: "success",
  },
];

const colorClasses = {
  primary: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary/10 text-secondary border-secondary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  accent: "bg-accent/10 text-accent border-accent/20",
};

const FeaturesSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Tout ce qu'il faut pour
            <span className="text-gradient"> acheter en confiance</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Une plateforme pensée pour les acheteurs, par les acheteurs. 
            Transparence totale, données vérifiées, communauté de confiance.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl glass hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`inline-flex p-3 rounded-xl border ${colorClasses[feature.color as keyof typeof colorClasses]} mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
