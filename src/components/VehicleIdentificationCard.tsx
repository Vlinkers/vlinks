import { 
  CheckCircle, AlertTriangle, Loader2, Car, Settings, Fuel, Gauge, Clock
} from "lucide-react";

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

interface VehicleIdentificationCardProps {
  vin: string;
  vinDecode: VINDecodeData | null | undefined;
  isLoading: boolean;
  lastUpdated?: string;
}

export const VehicleIdentificationCard = ({
  vin,
  vinDecode,
  isLoading,
  lastUpdated,
}: VehicleIdentificationCardProps) => {
  if (isLoading) {
    return (
      <div className="p-5 rounded-lg bg-card border border-border shadow-card mb-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          <span className="text-sm text-muted-foreground">Identification du véhicule...</span>
        </div>
      </div>
    );
  }

  if (!vinDecode) return null;

  if (!vinDecode.is_valid) {
    return (
      <div className="p-5 rounded-lg bg-danger/5 border border-danger/20 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-display font-semibold text-danger text-sm">VIN non reconnu</p>
            <p className="text-sm text-muted-foreground mt-1">
              {vinDecode.error_message || "Ce VIN ne correspond pas à un véhicule valide."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const vehicleName = [vinDecode.model_year, vinDecode.make, vinDecode.model, vinDecode.trim]
    .filter(Boolean)
    .join(" ");

  const detailItems: { label: string; value: string; icon: typeof Car }[] = [];
  if (vinDecode.body_class) detailItems.push({ label: "Type", value: vinDecode.body_class, icon: Car });
  if (vinDecode.engine) detailItems.push({ label: "Moteur", value: vinDecode.engine, icon: Settings });
  if (vinDecode.drive_type) detailItems.push({ label: "Transmission", value: vinDecode.drive_type, icon: Gauge });
  if (vinDecode.fuel_type) detailItems.push({ label: "Carburant", value: vinDecode.fuel_type, icon: Fuel });
  if (vinDecode.model_year) detailItems.push({ label: "Année", value: String(vinDecode.model_year), icon: Clock });

  return (
    <div className="rounded-lg bg-card border border-border shadow-card overflow-hidden mb-6">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
          <span className="text-xs font-medium text-success">VIN reconnu</span>
          <span className="text-xs text-muted-foreground font-mono ml-auto">{vin}</span>
        </div>

        <h1 className="font-display text-xl md:text-2xl font-bold text-foreground mt-2">
          {vehicleName || "Véhicule identifié"}
        </h1>

        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1">Dernière mise à jour : {lastUpdated}</p>
        )}
      </div>

      {detailItems.length > 0 && (
        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 pt-3 border-t border-border">
            {detailItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </span>
                <span className="text-xs font-medium text-foreground text-right truncate max-w-[55%]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
