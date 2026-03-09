import { Search, Upload, FileCheck, Users } from "lucide-react";

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
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Comment ça <span className="text-gradient">fonctionne</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Un processus simple pour restaurer la transparence dans l'achat de véhicules d'occasion.
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connection Line */}
          <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent hidden lg:block" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                {/* Step Card */}
                <div className="text-center">
                  {/* Number & Icon */}
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-card border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors shadow-card">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-display text-xl font-semibold mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
