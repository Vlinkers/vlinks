import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Check, Unlock, Eye, Gift, Sparkles, Award, Users, Search, Heart } from "lucide-react";

const Pricing = () => {
  const { t } = useLanguage();

  const creditPacks = [
    {
      nameKey: "pricing.pack1.name",
      credits: 5,
      priceKey: "pricing.pack1.price",
      descKey: "pricing.pack1.desc",
      highlighted: false
    },
    {
      nameKey: "pricing.pack2.name",
      credits: 10,
      priceKey: "pricing.pack2.price",
      descKey: "pricing.pack2.desc",
      highlighted: true
    },
    {
      nameKey: "pricing.pack3.name",
      credits: 20,
      priceKey: "pricing.pack3.price",
      descKey: "pricing.pack3.desc",
      highlighted: false
    }
  ];

  const earnCredits = [
    { icon: "📋", key: "pricing.earn.inspection" },
    { icon: "📄", key: "pricing.earn.history" },
    { icon: "💬", key: "pricing.earn.seller" },
    { icon: "🔧", key: "pricing.earn.mechanic" }
  ];

  return (
    <>
      <SEO 
        title="Tarifs - VLINKS"
        description="Accédez aux rapports véhicules pour 9,90$ par VIN ou économisez avec nos packs de crédits. Gagnez des crédits en contribuant à la communauté VLINKS."
        canonical="https://vlinks.ca/pricing"
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
        
        {/* SECTION 1 - Reassuring Introduction */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              {t("pricing.intro.title")}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              {t("pricing.intro.p1")}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {t("pricing.intro.p2")}
            </p>
          </div>
        </section>

        {/* SECTION 2 - Pedagogical Steps */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-3xl mx-auto">
            <div className="p-8 rounded-2xl glass border border-border/50">
              <div className="grid gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <Search className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-lg">{t("pricing.step1.title")}</span>
                    <span className="text-success font-medium ml-2">→ {t("pricing.step1.status")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <Eye className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-lg">{t("pricing.step2.title")}</span>
                    <span className="text-success font-medium ml-2">→ {t("pricing.step2.status")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Unlock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-lg">{t("pricing.step3.title")}</span>
                    <span className="text-primary font-medium ml-2">→ {t("pricing.step3.status")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 - VIN Access */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Unlock className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">
                {t("pricing.unlock.title")}
              </h2>
            </div>
            
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-background border-2 border-primary/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                <div>
                  <h3 className="font-display text-xl font-bold mb-2">{t("pricing.unlock.cardTitle")}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold text-primary">9,90 $</span>
                    <span className="text-muted-foreground">{t("pricing.unlock.perVin")}</span>
                  </div>
                </div>
                <Button variant="hero" size="lg" asChild>
                  <Link to="/auth">{t("pricing.unlock.cta")}</Link>
                </Button>
              </div>
              
              <p className="text-foreground/80 mb-6 leading-relaxed">
                {t("pricing.unlock.desc")}
              </p>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{t("pricing.unlock.f1")}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{t("pricing.unlock.f2")}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{t("pricing.unlock.f3")}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{t("pricing.unlock.f4")}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{t("pricing.unlock.f5")}</span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                {t("pricing.unlock.reassurance")}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4 - Contribute Alternative (Same Level as Payment) */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-warning" />
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">
                {t("pricing.contribute.title")}
              </h2>
            </div>
            
            <div className="p-8 rounded-2xl glass border border-warning/20">
              <p className="text-lg text-foreground/90 mb-4 leading-relaxed">
                {t("pricing.contribute.p1")}
              </p>
              <p className="text-lg text-foreground/90 mb-6 leading-relaxed font-medium">
                {t("pricing.contribute.p2")}
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {earnCredits.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-warning/5">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-sm text-foreground">{t(item.key)}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="secondary" size="lg" asChild>
                  <Link to="/auth">
                    <Gift className="w-4 h-4 mr-2" />
                    {t("pricing.earn.cta")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5 - Credit Packs (Humanized) */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">
                {t("pricing.packs.title")}
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {creditPacks.map((pack, index) => (
                <div 
                  key={index}
                  className={`relative p-6 rounded-xl transition-all duration-300 hover:-translate-y-1 ${
                    pack.highlighted 
                      ? "bg-gradient-to-b from-primary/15 to-background border-2 border-primary/50 shadow-glow" 
                      : "glass border border-border/50 hover:shadow-elevated"
                  }`}
                >
                  <h3 className="font-display text-lg font-bold mb-1">{t(pack.nameKey)}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t(pack.descKey)}</p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`font-display text-4xl font-bold ${pack.highlighted ? "text-primary" : ""}`}>
                      {pack.credits}
                    </span>
                    <span className="text-muted-foreground">{t("pricing.packs.credits")}</span>
                  </div>
                  
                  <div className="mb-6">
                    <span className="font-display text-2xl font-bold">{t(pack.priceKey)}</span>
                  </div>
                  
                  <Button 
                    variant={pack.highlighted ? "hero" : "outline"} 
                    className="w-full" 
                    asChild
                  >
                    <Link to="/auth">{t("pricing.packs.cta")}</Link>
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-sm text-muted-foreground text-center">
                {t("pricing.packs.note")}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6 - Moral Justification */}
        <section className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center p-8 rounded-2xl glass">
            <Heart className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-4">{t("pricing.philosophy.title")}</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("pricing.philosophy.intro")}
            </p>
            <ul className="text-left max-w-md mx-auto mb-6 space-y-2">
              <li className="flex items-start gap-2 text-muted-foreground">
                <span className="text-primary">•</span>
                <span>{t("pricing.philosophy.reason1")}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <span className="text-primary">•</span>
                <span>{t("pricing.philosophy.reason2")}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <span className="text-primary">•</span>
                <span>{t("pricing.philosophy.reason3")}</span>
              </li>
            </ul>
            <p className="text-muted-foreground mb-6">
              {t("pricing.philosophy.conclusion")}
            </p>
            <p className="text-sm text-primary font-medium italic">
              {t("common.tagline")}
            </p>
          </div>
        </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Pricing;