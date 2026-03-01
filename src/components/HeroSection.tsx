import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, FileText, MessageSquare, Eye, Plus } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const HeroSection = () => {
  const [vinInput, setVinInput] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (vinInput.trim()) {
      navigate(`/vin/${vinInput.toUpperCase()}`);
    }
  };

  const handleContribute = () => {
    const vin = vinInput.trim().toUpperCase();
    if (vin) {
      navigate(`/vin/${vin}`);
    } else {
      navigate("/auth?redirect=/");
    }
  };

  const bullets = [
    { icon: FileText, label: t("hero.bullet1") },
    { icon: MessageSquare, label: t("hero.bullet2") },
    { icon: Eye, label: t("hero.bullet3") },
  ];

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-secondary/8 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* H1 */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 animate-fade-in-up">
            {t("hero.headline1")}
          </h1>

          {/* Subtitle */}
          <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-muted-foreground mb-10 animate-fade-in-up stagger-1">
            {t("hero.subtitle")}
          </h2>

          {/* 3 Bullet Points */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-12 animate-fade-in-up stagger-2">
            {bullets.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="w-4 h-4 text-primary" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* VIN Search Bar — Main CTA */}
          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto mb-4 animate-fade-in-up stagger-3"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-primary rounded-2xl opacity-20 blur group-hover:opacity-30 transition-opacity" />
              <div className="relative flex items-center gap-2 p-2 rounded-xl glass-strong">
                <Search className="w-6 h-6 text-muted-foreground ml-4 shrink-0" />
                <Input
                  variant="vin"
                  placeholder={t("hero.searchPlaceholder")}
                  value={vinInput}
                  onChange={(e) => setVinInput(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  maxLength={17}
                />
                <Button type="submit" variant="hero" size="lg" className="shrink-0">
                  {t("hero.search")}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">
              {t("hero.vinLocation")}
            </p>
          </form>

          {/* Secondary CTA */}
          <div className="animate-fade-in-up stagger-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={handleContribute}
            >
              <Plus className="w-4 h-4" />
              {t("hero.contributeCta")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
