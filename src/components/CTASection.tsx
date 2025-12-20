import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Shield, Users, FileCheck } from "lucide-react";

const CTASection = () => {
  const [vinInput, setVinInput] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (vinInput.trim()) {
      navigate(`/vin/${vinInput.toUpperCase()}`);
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Prêt à acheter <span className="text-gradient">en toute confiance?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Rejoignez des milliers d'acheteurs qui font confiance à la communauté VLINKS 
            pour prendre des décisions éclairées.
          </p>

          {/* Search Bar */}
          <form 
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto mb-12"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-primary rounded-2xl opacity-30 blur group-hover:opacity-40 transition-opacity" />
              <div className="relative flex items-center gap-2 p-2 rounded-xl glass-strong">
                <Search className="w-6 h-6 text-muted-foreground ml-4" />
                <Input
                  variant="vin"
                  placeholder="Rechercher un VIN maintenant..."
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
          </form>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5 text-success" />
              <span>Données sécurisées</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5 text-primary" />
              <span>+12 000 contributeurs</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileCheck className="w-5 h-5 text-secondary" />
              <span>Rapports vérifiés</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
