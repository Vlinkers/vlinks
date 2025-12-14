import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  FileText, 
  Camera, 
  MessageSquare, 
  Wrench, 
  AlertTriangle, 
  ClipboardCheck,
  Users,
  TrendingUp,
  Shield,
  Gift
} from "lucide-react";

const HowItWorks = () => {
  const contributionTypes = [
    {
      icon: ClipboardCheck,
      title: "Rapports d'inspection professionnels",
      description: "Partagez les résumés de vos inspections pré-achat (CAA, garages certifiés, etc.) pour que d'autres acheteurs bénéficient de vos découvertes."
    },
    {
      icon: FileText,
      title: "Historiques de véhicule (Carfax, CarProof)",
      description: "Les données que vous avez payées peuvent aider d'autres acheteurs à éviter les mêmes frais et découvrir les mêmes informations."
    },
    {
      icon: MessageSquare,
      title: "Échanges avec le vendeur",
      description: "Documentez les conversations importantes : ce que le vendeur a affirmé, promis ou omis de mentionner."
    },
    {
      icon: Wrench,
      title: "Discussions avec des mécaniciens",
      description: "Les avis techniques informels d'un mécanicien peuvent révéler des problèmes que les rapports officiels ne mentionnent pas."
    },
    {
      icon: Camera,
      title: "Photos et vidéos",
      description: "Images du véhicule, de son état réel, des défauts constatés ou des réparations effectuées."
    },
    {
      icon: AlertTriangle,
      title: "Signaux d'alerte et observations",
      description: "Tout ce qui vous a semblé suspect : comportement du vendeur, incohérences, problèmes cachés."
    }
  ];

  const howItBuilds = [
    {
      step: "01",
      title: "Un acheteur découvre des informations",
      description: "Lors de sa recherche, un acheteur paie une inspection, obtient un historique, ou découvre des informations importantes sur un véhicule."
    },
    {
      step: "02",
      title: "Il partage ce qu'il a appris",
      description: "Plutôt que de laisser cette information disparaître, il la contribue sur VLINKS, associée au numéro VIN du véhicule."
    },
    {
      step: "03",
      title: "Les contributions s'accumulent",
      description: "Avec le temps, plusieurs acheteurs, anciens propriétaires et mécaniciens ajoutent leurs propres informations au même VIN."
    },
    {
      step: "04",
      title: "Une image complète émerge",
      description: "La combinaison de ces fragments de vérité révèle une vision transparente et fiable de l'historique réel du véhicule."
    }
  ];

  const contributorBenefits = [
    {
      icon: Gift,
      title: "Crédits et récompenses",
      description: "Chaque contribution validée vous rapporte des points échangeables contre des accès gratuits ou des avantages."
    },
    {
      icon: Users,
      title: "Reconnaissance communautaire",
      description: "Les contributeurs actifs sont reconnus et valorisés au sein de la communauté VLINKS."
    },
    {
      icon: TrendingUp,
      title: "Accès prioritaire",
      description: "Les contributeurs réguliers bénéficient d'un accès élargi aux informations de la plateforme."
    },
    {
      icon: Shield,
      title: "Protection de la vie privée",
      description: "Vos informations personnelles sont automatiquement anonymisées. Seules les informations techniques sont partagées."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Comment fonctionne <span className="text-gradient">VLINKS</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              VLINKS repose sur un principe simple : les informations que vous découvrez 
              sur un véhicule ne devraient pas disparaître après votre recherche. 
              Elles peuvent aider le prochain acheteur.
            </p>
          </div>
        </section>

        {/* Contribution Types */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4 text-center">
              Quelles informations pouvez-vous partager ?
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Toute information qui vous a aidé à évaluer un véhicule peut être précieuse pour d'autres.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              {contributionTypes.map((type, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-xl glass hover:bg-muted/30 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <type.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{type.title}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Builds */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4 text-center">
              Comment la transparence se construit
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Chaque contribution est un maillon. Ensemble, elles forment une chaîne de vérité.
            </p>
            
            <div className="space-y-8">
              {howItBuilds.map((item, index) => (
                <div 
                  key={index}
                  className="flex gap-6 items-start"
                >
                  <div className="shrink-0 w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="font-display text-lg font-bold text-primary-foreground">{item.step}</span>
                  </div>
                  <div className="pt-2">
                    <h3 className="font-semibold text-lg text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contributor Benefits */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4 text-center">
              Ce que vous gagnez en contribuant
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              VLINKS valorise les contributeurs qui partagent leurs découvertes.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              {contributorBenefits.map((benefit, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-xl border border-border/50 bg-card/50"
                >
                  <div className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tagline */}
        <section className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-muted-foreground/70 italic">
              « La vérité est une chaîne. Vous êtes le maillon. »
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;
