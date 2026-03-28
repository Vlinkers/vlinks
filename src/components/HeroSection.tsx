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
    <section ref={heroRef} className="pt-20 pb-12 px-4 bg-background">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
          Chaque VIN a une histoire.
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Avant d'acheter un véhicule usagé, consultez ce que les autres acheteurs ont découvert sur ce VIN.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
