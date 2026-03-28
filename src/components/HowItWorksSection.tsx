import { Search, Upload, FileCheck, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Recherchez un VIN",
    description: "Consultez le dossier public d'un véhicule.",
    action: "Entrez le VIN depuis l'annonce ou la carte grise",
  },
  {
    number: "02",
    icon: FileCheck,
    title: "Explorez les informations",
    description: "Documents, photos, chronologie, événements, observations.",
    action: "Inspections, échanges vendeur, photos, signaux d'alerte",
  },
  {
    number: "03",
    icon: Upload,
    title: "Contribuez au dossier",
    description: "Ajoutez une information utile pour enrichir la base publique.",
    action: "Votre expérience aide le prochain acheteur",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
            Comment fonctionne VLINKS
          </h2>
          <p className="text-muted-foreground">
            Un processus simple en trois étapes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-0 relative">
          {/* Connection lines between steps (desktop only) */}
          <div className="hidden md:block absolute top-[72px] left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] h-px border-t-2 border-dashed border-primary/20" />

          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center text-center px-4">
              {/* Large editorial step number */}
              <span className="font-display text-5xl lg:text-6xl font-black text-primary/15 leading-none select-none mb-2">
                {step.number}
              </span>

              {/* Icon circle */}
              <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-5 relative z-10">
                <step.icon className="w-7 h-7 text-primary" />
              </div>

              {/* Mobile arrow between steps */}
              {index < steps.length - 1 && (
                <div className="md:hidden absolute -bottom-3 left-1/2 -translate-x-1/2">
                  <ArrowRight className="w-4 h-4 text-primary/30 rotate-90" />
                </div>
              )}

              <h3 className="font-display text-lg font-semibold mb-2 text-foreground">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                {step.description}
              </p>
              <p className="text-xs font-medium text-primary/80">
                {step.action}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
