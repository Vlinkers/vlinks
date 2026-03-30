import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, Image, AlertCircle, DollarSign } from "lucide-react";

const examples = [
  {
    icon: FileCheck,
    title: "Rapport d'inspection",
    description: "Inspection mécanique détaillée",
  },
  {
    icon: Image,
    title: "Photos récentes",
    description: "État actuel du véhicule",
  },
  {
    icon: DollarSign,
    title: "Mise en vente",
    description: "Historique des prix",
  },
  {
    icon: AlertCircle,
    title: "Changement de propriétaire",
    description: "Historique de possession",
  },
];

const DossierExamplesSection = () => {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Exemple de dossier VLINKS
          </h2>
          <p className="text-muted-foreground">
            Visualisez le type d'informations disponibles pour chaque véhicule
          </p>
        </div>

        <Card className="mb-8 border-2">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  2018 Volvo XC90 T6 Momentum
                </h3>
                <p className="text-sm text-muted-foreground">VIN: <span className="vin-code">YV4A22PK2J1234567</span></p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  6 contributions
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  2 documents
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  8 photos
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  3 signaux
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {examples.map((example, index) => (
            <Card key={index} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <example.icon className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold text-foreground mb-1">{example.title}</h4>
                <p className="text-sm text-muted-foreground">{example.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DossierExamplesSection;
