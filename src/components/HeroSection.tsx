import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
    <section ref={heroRef} className="pt-20 pb-16 px-4 bg-[#0F172A]">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          Chaque VIN a une histoire.
        </h1>
        <p className="text-base sm:text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
          Avant d'acheter un véhicule usagé, consultez ce que les autres acheteurs ont découvert sur ce VIN.
        </p>
        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-4">
          <div className="flex items-center bg-white rounded-full overflow-hidden shadow-lg">
            <Search className="w-5 h-5 text-slate-400 ml-5 shrink-0" />
            <Input
              type="text"
              placeholder="Entrez un numéro VIN (ex: 1HGBH41JXMN109186)"
              value={vinInput}
              onChange={(e) => setVinInput(e.target.value.toUpperCase())}
              maxLength={17}
              className="flex-1 border-0 bg-transparent h-14 text-base font-mono tracking-wider uppercase text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
            />
            <Button type="submit" className="h-10 rounded-full px-6 mr-2 shrink-0 font-semibold">
              Rechercher →
            </Button>
          </div>
        </form>
        <p className="text-sm text-slate-500">Aucune inscription requise pour consulter</p>
      </div>
    </section>
  );
};

export default HeroSection;
