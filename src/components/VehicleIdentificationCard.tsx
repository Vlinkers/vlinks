import { 
  CheckCircle, AlertTriangle, Loader2, Car, Settings, Fuel, Gauge, Calendar
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
      <div className="rounded-xl border border-border bg-card shadow-sm mb-5">
        <div className="p-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Identification du véhicule...</span>
        </div>
      </div>
    );
  }

  if (!vinDecode) return null;

  if (!vinDecode.is_valid) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 mb-5">
        <div className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="font-display font-semibold text-danger">VIN non reconnu</p>
            <p className="text-sm text-muted-foreground mt-1">
              {vinDecode.error_message || "Ce VIN ne correspond pas à un véhicule valide dans la base NHTSA."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const vehicleName = [vinDecode.model_year, vinDecode.make, vinDecode.model]
    .filter(Boolean)
    .join(" ");

  const specs: { icon: typeof Car; value: string }[] = [];
  if (vinDecode.trim) specs.push({ icon: Car, value: vinDecode.trim });
  if (vinDecode.body_class) specs.push({ icon: Car, value: vinDecode.body_class });
  if (vinDecode.engine) specs.push({ icon: Settings, value: vinDecode.engine });
  if (vinDecode.drive_type) specs.push({ icon: Gauge, value: vinDecode.drive_type });
  if (vinDecode.fuel_type) specs.push({ icon: Fuel, value: vinDecode.fuel_type });

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mb-5">
      {/* Main header */}
      <div className="p-5 md:p-6">
        {/* Status + VIN row */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-success" />
            </div>
            <span className="text-xs font-medium text-success">Véhicule identifié</span>
          </div>
          <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">
            {vin}
          </code>
        </div>

        {/* Vehicle name */}
        <h1 className="font-display text-xl md:text-2xl font-bold text-foreground leading-tight">
          {vehicleName || "Véhicule"}
        </h1>

        {/* Last updated */}
        {lastUpdated && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Mis à jour {lastUpdated}</span>
          </div>
        )}
      </div>

      {/* Specs bar */}
      {specs.length > 0 && (
        <div className="px-5 md:px-6 pb-5 md:pb-6">
          <div className="flex flex-wrap gap-2">
            {specs.slice(0, 4).map((spec, i) => (
              <div 
                key={i} 
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted text-xs text-muted-foreground"
              >
                <spec.icon className="w-3 h-3" />
                <span className="truncate max-w-[140px]">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
