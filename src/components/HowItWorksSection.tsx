import { Search, Upload, FileCheck } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Recherchez un VIN",
    description: "Consultez le dossier public d'un véhicule.",
  },
  {
    number: "02",
    icon: FileCheck,
    title: "Explorez les informations",
    description: "Documents, photos, chronologie, événements, observations.",
  },
  {
    number: "03",
    icon: Upload,
    title: "Contribuez au dossier",
    description: "Ajoutez une information utile pour enrichir la base publique.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
            Comment fonctionne VLINKS
          </h2>
          <p className="text-muted-foreground">
            Un processus simple en trois étapes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {step.number}
                </div>
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-foreground">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
