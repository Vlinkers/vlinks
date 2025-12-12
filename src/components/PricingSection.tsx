import { Check, Sparkles, Crown, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Gratuit",
    description: "Pour commencer à explorer",
    price: "0$",
    period: "pour toujours",
    icon: Sparkles,
    features: [
      "Recherche VIN illimitée",
      "Accès aux avis communautaires",
      "Historique basique des annonces",
      "Contribution et gamification",
      "Support communautaire",
    ],
    cta: "Commencer gratuitement",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Premium",
    description: "Pour les acheteurs sérieux",
    price: "9.99$",
    period: "/mois",
    icon: Crown,
    features: [
      "Tout du plan Gratuit",
      "Rapports consolidés illimités",
      "Scoring de risque avancé",
      "Alertes prix et annonces",
      "Historique complet des propriétaires",
      "Support prioritaire",
      "Badge Premium visible",
    ],
    cta: "Essayer 7 jours gratuits",
    variant: "hero" as const,
    popular: true,
  },
  {
    name: "Pro",
    description: "Pour les professionnels",
    price: "49$",
    period: "/mois",
    icon: Building,
    features: [
      "Tout du plan Premium",
      "API d'accès aux données",
      "Tableau de bord analytique",
      "Gestion multi-utilisateurs",
      "Intégration CRM",
      "Rapports personnalisés",
      "Account manager dédié",
    ],
    cta: "Contacter les ventes",
    variant: "secondary" as const,
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Des plans pour <span className="text-gradient">chaque besoin</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Commencez gratuitement, évoluez selon vos besoins. Annulez à tout moment.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 ${
                plan.popular
                  ? "glass-strong shadow-glow border-primary/30"
                  : "glass hover:shadow-elevated"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="premium" className="px-4 py-1">
                    Plus populaire
                  </Badge>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <div className={`inline-flex p-3 rounded-xl mb-4 ${
                  plan.popular 
                    ? "bg-primary/10 text-primary" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <plan.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="text-center mb-8">
                <span className="font-display text-5xl font-bold">
                  {plan.price}
                </span>
                <span className="text-muted-foreground ml-1">
                  {plan.period}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 mt-0.5 ${
                      plan.popular ? "text-primary" : "text-success"
                    }`} />
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button 
                variant={plan.variant} 
                size="lg" 
                className="w-full"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <p className="text-center text-sm text-muted-foreground mt-12">
          Tous les prix sont en CAD. Taxes applicables en sus. 
          <a href="#" className="text-primary hover:underline ml-1">
            Voir les conditions complètes
          </a>
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
