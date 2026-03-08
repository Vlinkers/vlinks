import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";

const HeroSection = () => {
  const [vinInput, setVinInput] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (vinInput.trim()) {
      navigate(`/vin/${vinInput.toUpperCase()}`);
    }
  };

  return (
    <section className="pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Consultez le dossier d'un véhicule
        </h1>
        <p className="text-muted-foreground text-base mb-8">
          Contributions, documents, photos et signaux partagés par la communauté des Vlinkers.
        </p>

        <form onSubmit={handleSearch} className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-card border border-border shadow-card">
            <Search className="w-5 h-5 text-muted-foreground ml-3 shrink-0" />
            <Input
              type="text"
              placeholder="Entrez un numéro VIN (ex: 1HGBH41JXMN109186)"
              value={vinInput}
              onChange={(e) => setVinInput(e.target.value.toUpperCase())}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-mono"
              maxLength={17}
            />
            <Button type="submit" size="sm" className="shrink-0">
              Rechercher
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Le VIN se trouve sur la carte grise, le tableau de bord ou le cadre de la portière.
          </p>
        </form>
      </div>
    </section>
  );
};

export default HeroSection;
