import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Shield, Users, Eye, ArrowRight } from "lucide-react";

const HeroSection = () => {
  const [vinInput, setVinInput] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (vinInput.trim()) {
      navigate(`/vin/${vinInput.toUpperCase()}`);
    }
  };

  const stats = [
    { value: "50K+", label: "VINs documentés" },
    { value: "12K+", label: "Contributeurs actifs" },
    { value: "98%", label: "Taux de confiance" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-12 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in-up">
            <Shield className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">
              Plateforme communautaire indépendante
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up stagger-1">
            L'historique véhicule
            <br />
            <span className="text-gradient">par ceux qui savent</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up stagger-2">
            Accédez aux avis, inspections et historiques partagés par la communauté. 
            Fini les mauvaises surprises lors de l'achat d'un véhicule d'occasion.
          </p>

          {/* Search Bar */}
          <form 
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto mb-12 animate-fade-in-up stagger-3"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-primary rounded-2xl opacity-20 blur group-hover:opacity-30 transition-opacity" />
              <div className="relative flex items-center gap-2 p-2 rounded-xl glass-strong">
                <Search className="w-6 h-6 text-muted-foreground ml-4" />
                <Input
                  variant="vin"
                  placeholder="Entrez un numéro VIN (ex: WVWZZZ3CZWE123456)"
                  value={vinInput}
                  onChange={(e) => setVinInput(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  maxLength={17}
                />
                <Button type="submit" variant="hero" size="lg" className="shrink-0">
                  Rechercher
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Le VIN se trouve sur le tableau de bord, la portière ou les documents du véhicule
            </p>
          </form>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 animate-fade-in-up stagger-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold text-gradient">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Trust Icons */}
          <div className="flex justify-center gap-8 mt-12 animate-fade-in-up stagger-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <span className="text-sm">Communauté vérifiée</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="w-5 h-5" />
              <span className="text-sm">Données anonymisées</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5" />
              <span className="text-sm">100% indépendant</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
