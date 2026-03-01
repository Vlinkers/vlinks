import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LaunchBanner from "@/components/LaunchBanner";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Check, Eye, Search, Heart } from "lucide-react";

const Pricing = () => {
  const { t } = useLanguage();

  return (
    <>
      <SEO 
        title="Tarifs - VLINKS"
        description="VLINKS est gratuit pendant la phase de lancement. Consultez les dossiers VIN et téléchargez les rapports sans frais."
        canonical="https://vlinks.ca/pricing"
      />
      <div className="min-h-screen bg-background">
        <LaunchBanner />
        <Header />
        <main className="pt-24 pb-16">
        
        {/* Introduction */}
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

        {/* Steps */}
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
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <Check className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-lg">{t("pricing.step3.title")}</span>
                    <span className="text-success font-medium ml-2">→ {t("pricing.step3.status")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Access */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">
              {t("pricing.unlock.title")}
            </h2>
            
            <div className="p-8 rounded-2xl bg-gradient-to-br from-success/10 via-background to-background border-2 border-success/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                <div>
                  <h3 className="font-display text-xl font-bold mb-2">{t("pricing.unlock.cardTitle")}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold text-success">Gratuit</span>
                    <span className="text-muted-foreground">pendant le lancement</span>
                  </div>
                </div>
                <Button variant="hero" size="lg" asChild>
                  <Link to="/">{t("pricing.unlock.cta")}</Link>
                </Button>
              </div>
              
              <p className="text-foreground/80 mb-6 leading-relaxed">
                {t("pricing.unlock.desc")}
              </p>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {["pricing.unlock.f1", "pricing.unlock.f2", "pricing.unlock.f3", "pricing.unlock.f4", "pricing.unlock.f5"].map((key) => (
                  <div key={key} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{t(key)}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                {t("pricing.unlock.reassurance")}
              </p>
            </div>
          </div>
        </section>

        {/* Contribute */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">
              {t("pricing.contribute.title")}
            </h2>
            
            <div className="p-8 rounded-2xl glass border border-border/50">
              <p className="text-lg text-foreground/90 mb-4 leading-relaxed">
                {t("pricing.contribute.p1")}
              </p>
              <p className="text-foreground/80 leading-relaxed">
                {t("pricing.contribute.p2")}
              </p>
            </div>
          </div>
        </section>

        {/* Philosophy */}
        <section className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center p-8 rounded-2xl glass">
            <Heart className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-4">{t("pricing.philosophy.title")}</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("pricing.philosophy.intro")}
            </p>
            <ul className="text-left max-w-md mx-auto mb-6 space-y-2">
              {["pricing.philosophy.reason1", "pricing.philosophy.reason2", "pricing.philosophy.reason3"].map((key) => (
                <li key={key} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-primary">•</span>
                  <span>{t(key)}</span>
                </li>
              ))}
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
