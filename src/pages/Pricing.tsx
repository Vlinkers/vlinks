import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Check, Gift, Star, Crown } from "lucide-react";

const Pricing = () => {
  const { t } = useLanguage();

  const plans = [
    {
      nameKey: "pricing.plan1.name",
      icon: Gift,
      priceKey: "pricing.plan1.price",
      periodKey: "",
      descKey: "pricing.plan1.desc",
      features: [
        "pricing.plan1.f1",
        "pricing.plan1.f2",
        "pricing.plan1.f3",
        "pricing.plan1.f4"
      ],
      ctaKey: "pricing.plan1.cta",
      variant: "outline" as const,
      highlighted: false
    },
    {
      nameKey: "pricing.plan2.name",
      icon: Star,
      priceKey: "pricing.plan2.price",
      periodKey: "pricing.plan2.period",
      descKey: "pricing.plan2.desc",
      features: [
        "pricing.plan2.f1",
        "pricing.plan2.f2",
        "pricing.plan2.f3",
        "pricing.plan2.f4",
        "pricing.plan2.f5"
      ],
      ctaKey: "pricing.plan2.cta",
      variant: "hero" as const,
      highlighted: true
    },
    {
      nameKey: "pricing.plan3.name",
      icon: Crown,
      priceKey: "pricing.plan3.price",
      periodKey: "pricing.plan3.period",
      descKey: "pricing.plan3.desc",
      features: [
        "pricing.plan3.f1",
        "pricing.plan3.f2",
        "pricing.plan3.f3",
        "pricing.plan3.f4",
        "pricing.plan3.f5"
      ],
      ctaKey: "pricing.plan3.cta",
      variant: "outline" as const,
      highlighted: false
    }
  ];

  const contributorCredits = [
    { typeKey: "pricing.credit1.type", pointsKey: "pricing.credit1.points", accessKey: "pricing.credit1.access" },
    { typeKey: "pricing.credit2.type", pointsKey: "pricing.credit2.points", accessKey: "pricing.credit2.access" },
    { typeKey: "pricing.credit3.type", pointsKey: "pricing.credit3.points", accessKey: "pricing.credit3.access" },
    { typeKey: "pricing.credit4.type", pointsKey: "pricing.credit4.points", accessKey: "pricing.credit4.access" },
    { typeKey: "pricing.credit5.type", pointsKey: "pricing.credit5.points", accessKey: "pricing.credit5.access" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              {t("pricing.title")} <span className="text-gradient">{t("pricing.titleGradient")}</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("pricing.subtitle")}
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
                      ? "bg-gradient-to-b from-primary/10 to-background border-2 border-primary/50" 
                      : "glass border border-border/50"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {t("pricing.popular")}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.highlighted ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <plan.icon className={`w-5 h-5 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <h3 className="font-display text-xl font-bold">{t(plan.nameKey)}</h3>
                  </div>
                  
                  <div className="mb-4">
                    <span className="font-display text-3xl font-bold">{t(plan.priceKey)}</span>
                    {plan.periodKey && (
                      <span className="text-muted-foreground ml-1">{t(plan.periodKey)}</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6">{t(plan.descKey)}</p>
                  
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((featureKey, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{t(featureKey)}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button variant={plan.variant} className="w-full" asChild>
                    <Link to="/auth">{t(plan.ctaKey)}</Link>
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
              {t("pricing.creditsTitle")}
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              {t("pricing.creditsSubtitle")}
            </p>
            
            <div className="overflow-hidden rounded-xl border border-border/50">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground">{t("pricing.tableType")}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-foreground">{t("pricing.tablePoints")}</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-foreground">{t("pricing.tableEquivalent")}</th>
                  </tr>
                </thead>
                <tbody>
                  {contributorCredits.map((credit, index) => (
                    <tr key={index} className="border-t border-border/50">
                      <td className="px-4 py-3 text-sm text-foreground">{t(credit.typeKey)}</td>
                      <td className="px-4 py-3 text-sm text-center font-medium text-primary">{t(credit.pointsKey)}</td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{t(credit.accessKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              {t("pricing.creditsNote")}
            </p>
          </div>
        </section>

        {/* FAQ or Note */}
        <section className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center p-6 rounded-xl glass">
            <h3 className="font-semibold text-foreground mb-2">{t("pricing.faqTitle")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("pricing.faqDesc")}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
