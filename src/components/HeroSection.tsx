import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
    <section ref={heroRef} className="pt-28 pb-20 px-4 bg-[#0F172A]">
      <div className="max-w-[640px] mx-auto text-center">
        {/* Eyebrow */}
        <p className="text-[#3B82F6] text-xs font-medium tracking-[0.2em] uppercase mb-6">
          🇨🇦 Plateforme communautaire · Québec
        </p>

        {/* H1 */}
        <h1 className="font-display text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem] font-bold text-white leading-tight mb-4">
          Chaque VIN a une{" "}
          <em className="italic text-[#60A5FA] not-italic font-bold" style={{ fontStyle: "italic" }}>histoire</em>.
        </h1>

        {/* Subtitle */}
        <p className="text-[#94A3B8] text-base mb-10 max-w-lg mx-auto leading-relaxed">
          Avant d'acheter un véhicule usagé, consultez ce que les autres acheteurs ont découvert sur ce VIN.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="max-w-[540px] mx-auto mb-4">
          <div className="flex items-center bg-white rounded-[10px] overflow-hidden shadow-lg">
            <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
            <input
              type="text"
              placeholder="Entrez un numéro VIN..."
              value={vinInput}
              onChange={(e) => setVinInput(e.target.value.toUpperCase())}
              maxLength={17}
              className="flex-1 h-[52px] bg-transparent text-base font-mono tracking-wider uppercase text-slate-900 placeholder:text-slate-400 border-0 outline-none px-3"
            />
            <Button
              type="submit"
              className="h-10 rounded-lg px-6 mr-1.5 shrink-0 font-semibold text-sm"
            >
              Rechercher →
            </Button>
          </div>
        </form>

        {/* Helper text */}
        <p className="text-[#64748B] text-[13px]">
          Aucune inscription requise pour consulter
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
