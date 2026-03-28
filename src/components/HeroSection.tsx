import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";

const HeroSection = ({ onVisibilityChange }: { onVisibilityChange?: (visible: boolean) => void }) => {
  const [vinInput, setVinInput] = useState("");
  const navigate = useNavigate();

  const heroRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!onVisibilityChange || !heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => onVisibilityChange(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (vinInput.trim()) {
      navigate(`/vin/${vinInput.toUpperCase()}`);
    }
  };

  return (
    <section className="pt-20 pb-12 px-4 bg-background">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
          Consultez le dossier d'un véhicule
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          VLINKS permet de consulter un dossier véhicule enrichi par la communauté : 
          documents, photos, événements, observations et historique.
        </p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-3 p-2 rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center flex-1 gap-3 px-3">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Entrez un numéro VIN (ex: 1HGBH41JXMN109186)"
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-mono px-0"
                maxLength={17}
              />
            </div>
            <Button type="submit" size="lg" className="sm:w-auto">
              Ouvrir le dossier
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-left">
            Le VIN se trouve sur la carte grise, le tableau de bord ou le cadre de la portière.
          </p>
        </form>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Button 
            variant="outline" 
            size="default"
            onClick={() => navigate("/auth")}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une contribution
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
