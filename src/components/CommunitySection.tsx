import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

const CommunitySection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Les Vlinkers enrichissent la base
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Chaque dossier VIN évolue grâce aux contributions de la communauté. 
            Un document, une photo, une mise en vente, un changement de propriétaire 
            ou une simple observation peuvent aider les prochains utilisateurs à mieux 
            comprendre un véhicule.
          </p>
        </div>
        <div className="text-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Contribuer à un dossier
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
