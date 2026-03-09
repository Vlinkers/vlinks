import { Card, CardContent } from "@/components/ui/card";
import { FileText, Image, Clock, Eye, TrendingUp, RefreshCw } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Rapports et documents",
    description: "Inspections, rapports mécaniques, documents officiels",
  },
  {
    icon: Image,
    title: "Photos du véhicule",
    description: "Galerie de photos récentes et historiques",
  },
  {
    icon: Clock,
    title: "Historique chronologique",
    description: "Ligne du temps des événements importants",
  },
  {
    icon: Eye,
    title: "Observations terrain",
    description: "Notes et observations des propriétaires et acheteurs",
  },
  {
    icon: TrendingUp,
    title: "Mises en vente et prix",
    description: "Historique des annonces et changements de prix",
  },
  {
    icon: RefreshCw,
    title: "Changements de propriétaire",
    description: "Historique de possession et transferts",
  },
];

const WhatYouCanFindSection = () => {
  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Ce que vous pouvez trouver dans un dossier VIN
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Chaque dossier regroupe les informations utiles pour comprendre l'historique d'un véhicule
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatYouCanFindSection;
