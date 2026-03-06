import { 
  CheckCircle, AlertTriangle, Loader2, Car, Settings, Fuel, Gauge, 
  FileText, Camera, Plus, Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VINDecodeData {
  make: string | null;
  model: string | null;
  model_year: number | null;
  trim: string | null;
  engine: string | null;
  body_class: string | null;
  drive_type: string | null;
  fuel_type: string | null;
  is_valid: boolean;
  error_message: string | null;
}

interface VLINKSDossier {
  totalContributions: number;
  documentCount: number;
  photoCount: number;
}

interface VehicleIdentificationCardProps {
  vin: string;
  vinDecode: VINDecodeData | null | undefined;
  isLoading: boolean;
  dossier?: VLINKSDossier;
  lastUpdated?: string;
  onContribute?: () => void;
  showContributeButton?: boolean;
}

export const VehicleIdentificationCard = ({
  vin,
  vinDecode,
  isLoading,
  dossier,
  lastUpdated,
  onContribute,
  showContributeButton = true,
}: VehicleIdentificationCardProps) => {
  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl glass border border-border/50 mb-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          <span className="text-sm text-muted-foreground">Identification du véhicule...</span>
        </div>
      </div>
    );
  }

  if (!vinDecode) return null;

  if (!vinDecode.is_valid) {
    return (
      <div className="p-6 rounded-2xl bg-danger/10 border border-danger/30 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-display font-semibold text-danger">VIN non reconnu</p>
            <p className="text-sm text-muted-foreground mt-1">
              {vinDecode.error_message || "Ce VIN ne correspond pas à un véhicule valide ou n'est pas reconnu par la base NHTSA."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const vehicleName = [vinDecode.model_year, vinDecode.make, vinDecode.model, vinDecode.trim]
    .filter(Boolean)
    .join(" ");

  // Build compact specs line
  const specsItems = [
    vinDecode.body_class,
    vinDecode.engine,
    vinDecode.drive_type,
    vinDecode.fuel_type,
  ].filter(Boolean);

  // Build detail grid items
  const detailItems: { label: string; value: string; icon: typeof Car }[] = [];
  if (vinDecode.body_class) detailItems.push({ label: "Type", value: vinDecode.body_class, icon: Car });
  if (vinDecode.engine) detailItems.push({ label: "Moteur", value: vinDecode.engine, icon: Settings });
  if (vinDecode.drive_type) detailItems.push({ label: "Transmission", value: vinDecode.drive_type, icon: Gauge });
  if (vinDecode.fuel_type) detailItems.push({ label: "Carburant", value: vinDecode.fuel_type, icon: Fuel });
  if (vinDecode.trim) detailItems.push({ label: "Finition", value: vinDecode.trim, icon: Car });
  if (vinDecode.model_year) detailItems.push({ label: "Année", value: String(vinDecode.model_year), icon: Clock });

  return (
    <div className="rounded-2xl glass border border-border/50 overflow-hidden mb-6">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <span className="text-sm font-medium text-success">VIN reconnu</span>
          <span className="text-xs text-muted-foreground font-mono ml-auto hidden sm:block">{vin}</span>
        </div>

        {/* Vehicle name - prominent */}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">
          {vehicleName || "Véhicule identifié"}
        </h2>
        <p className="text-xs text-muted-foreground font-mono mt-1 sm:hidden">{vin}</p>

        {/* Compact specs line */}
        {specsItems.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {specsItems.join(" • ")}
          </p>
        )}
      </div>

      {/* Detail grid */}
      {detailItems.length > 0 && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-4 border-t border-border/30">
            {detailItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </span>
                <span className="text-sm font-medium text-foreground text-right max-w-[60%] truncate">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VLINKS Dossier */}
      <div className="px-6 pb-5">
        <div className="pt-4 border-t border-border/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Dossier VLINKS</h3>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">Mis à jour : {lastUpdated}</span>
            )}
          </div>

          {dossier && dossier.totalContributions > 0 ? (
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                {dossier.totalContributions} contribution{dossier.totalContributions > 1 ? "s" : ""}
              </Badge>
              {dossier.documentCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  {dossier.documentCount} document{dossier.documentCount > 1 ? "s" : ""}
                </Badge>
              )}
              {dossier.photoCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Camera className="w-3 h-3 mr-1" />
                  {dossier.photoCount} photo{dossier.photoCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Aucune contribution pour ce VIN pour le moment.
              </p>
              {showContributeButton && onContribute && (
                <Button variant="outline" size="sm" onClick={onContribute}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une contribution
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
