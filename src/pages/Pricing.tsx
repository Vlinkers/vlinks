import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, Gift, Star, Crown } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Gratuit",
      icon: Gift,
      price: "0 $",
      period: "",
      description: "Accès de base pour découvrir la plateforme",
      features: [
        "Recherche illimitée de VINs",
        "Aperçu des contributions disponibles",
        "Nombre de contributions visible",
        "Résumé général du véhicule"
      ],
      cta: "Commencer gratuitement",
      variant: "outline" as const,
      highlighted: false
    },
    {
      name: "Accès VIN",
      icon: Star,
      price: "4,99 $",
      period: "par VIN",
      description: "Accès complet aux informations d'un véhicule spécifique",
      features: [
        "Toutes les contributions détaillées",
        "Photos et documents partagés",
        "Historique des observations",
        "Signaux d'alerte identifiés",
        "Résumés d'inspection"
      ],
      cta: "Débloquer un VIN",
      variant: "hero" as const,
      highlighted: true
    },
    {
      name: "Contributeur",
      icon: Crown,
      price: "Gratuit",
      period: "avec contributions",
      description: "Accès gratuit en échange de vos contributions",
      features: [
        "1 contribution validée = 1 accès VIN gratuit",
        "Points cumulables",
        "Badge contributeur",
        "Accès prioritaire aux nouvelles fonctionnalités",
        "Reconnaissance communautaire"
      ],
      cta: "Contribuer maintenant",
      variant: "outline" as const,
      highlighted: false
    }
  ];

  const contributorCredits = [
    {
      type: "Rapport d'inspection partagé",
      points: "50 points",
      access: "= 5 accès VIN"
    },
    {
      type: "Historique véhicule (Carfax, etc.)",
      points: "30 points",
      access: "= 3 accès VIN"
    },
    {
      type: "Photos avec description",
      points: "10 points",
      access: "= 1 accès VIN"
    },
    {
      type: "Observation ou signal d'alerte",
      points: "5 points",
      access: "= 0.5 accès VIN"
    },
    {
      type: "Échange documenté avec vendeur",
      points: "15 points",
      access: "= 1.5 accès VIN"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Tarifs <span className="text-gradient">simples et transparents</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Accédez aux informations dont vous avez besoin, ou contribuez pour obtenir 
              des accès gratuits. Pas d'abonnement obligatoire, pas de frais cachés.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
                <div 
                  key={index}
                  className={`relative p-6 rounded-xl ${
                    plan.highlighted 
                      ? 'bg-gradient-to-b from-primary/10 to-background border-2 border-primary/50' 
                      : 'glass border border-border/50'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      Populaire
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.highlighted ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <plan.icon className={`w-5 h-5 ${plan.highlighted ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  </div>
                  
                  <div className="mb-4">
                    <span className="font-display text-3xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground ml-1">{plan.period}</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                  
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button variant={plan.variant} className="w-full" asChild>
                    <Link to="/auth">{plan.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contributor Credits Table */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4 text-center">
              Barème des contributions
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              Plus votre contribution est complète et utile, plus elle vous rapporte.
            </p>
            
            <div className="overflow-hidden rounded-xl border border-border/50">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Type de contribution</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-foreground">Points</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-foreground">Équivalent</th>
                  </tr>
                </thead>
                <tbody>
                  {contributorCredits.map((credit, index) => (
                    <tr key={index} className="border-t border-border/50">
                      <td className="px-4 py-3 text-sm text-foreground">{credit.type}</td>
                      <td className="px-4 py-3 text-sm text-center font-medium text-primary">{credit.points}</td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{credit.access}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              10 points = 1 accès VIN complet. Les points n'expirent jamais.
            </p>
          </div>
        </section>

        {/* FAQ or Note */}
        <section className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center p-6 rounded-xl glass">
            <h3 className="font-semibold text-foreground mb-2">Pourquoi ce modèle ?</h3>
            <p className="text-sm text-muted-foreground">
              VLINKS fonctionne grâce à la communauté. Les frais d'accès permettent de maintenir 
              la plateforme et de récompenser les contributeurs. Plus vous contribuez, moins vous payez.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
