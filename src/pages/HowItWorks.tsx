import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useLanguage } from "@/hooks/useLanguage";
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
  const { t } = useLanguage();

  const contributionTypes = [
    {
      icon: ClipboardCheck,
      titleKey: "how.type1.title",
      descKey: "how.type1.desc"
    },
    {
      icon: FileText,
      titleKey: "how.type2.title",
      descKey: "how.type2.desc"
    },
    {
      icon: MessageSquare,
      titleKey: "how.type3.title",
      descKey: "how.type3.desc"
    },
    {
      icon: Wrench,
      titleKey: "how.type4.title",
      descKey: "how.type4.desc"
    },
    {
      icon: Camera,
      titleKey: "how.type5.title",
      descKey: "how.type5.desc"
    },
    {
      icon: AlertTriangle,
      titleKey: "how.type6.title",
      descKey: "how.type6.desc"
    }
  ];

  const howItBuilds = [
    { step: "01", titleKey: "how.step1.title", descKey: "how.step1.desc" },
    { step: "02", titleKey: "how.step2.title", descKey: "how.step2.desc" },
    { step: "03", titleKey: "how.step3.title", descKey: "how.step3.desc" },
    { step: "04", titleKey: "how.step4.title", descKey: "how.step4.desc" }
  ];

  const contributorBenefits = [
    { icon: Gift, titleKey: "how.benefit1.title", descKey: "how.benefit1.desc" },
    { icon: Users, titleKey: "how.benefit2.title", descKey: "how.benefit2.desc" },
    { icon: TrendingUp, titleKey: "how.benefit3.title", descKey: "how.benefit3.desc" },
    { icon: Shield, titleKey: "how.benefit4.title", descKey: "how.benefit4.desc" }
  ];

  return (
    <>
      <SEO 
        title="Comment ça marche - VLINKS"
        description="Découvrez comment contribuer à VLINKS : partagez vos rapports d'inspection, avis et photos pour aider la communauté d'acheteurs de véhicules d'occasion."
        canonical="https://vlinks.ca/how-it-works"
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              {t("how.title")} <span className="text-gradient">VLINKS</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("how.subtitle")}
            </p>
          </div>
        </section>

        {/* Contribution Types */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4 text-center">
              {t("how.typesTitle")}
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              {t("how.typesSubtitle")}
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
                      <h3 className="font-semibold text-foreground mb-2">{t(type.titleKey)}</h3>
                      <p className="text-sm text-muted-foreground">{t(type.descKey)}</p>
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
              {t("how.buildTitle")}
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              {t("how.buildSubtitle")}
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
                    <h3 className="font-semibold text-lg text-foreground mb-2">{t(item.titleKey)}</h3>
                    <p className="text-muted-foreground">{t(item.descKey)}</p>
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
              {t("how.benefitsTitle")}
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              {t("how.benefitsSubtitle")}
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
                      <h3 className="font-semibold text-foreground mb-1">{t(benefit.titleKey)}</h3>
                      <p className="text-sm text-muted-foreground">{t(benefit.descKey)}</p>
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

export default HowItWorks;
