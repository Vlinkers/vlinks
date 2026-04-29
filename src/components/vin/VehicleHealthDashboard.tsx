import { Card } from "@/components/ui/card";
import { useVehicleHealth } from "@/hooks/useVehicleHealth";
import { VehicleSchematic } from "./VehicleSchematic";
import { SystemStatusBar } from "./SystemStatusBar";
import { HealthKPIs } from "./HealthKPIs";
import type { EventWithFacts } from "@/hooks/useVinDossier";
import type { SystemKey } from "@/lib/maintenanceLogTypes";

interface VehicleHealthDashboardProps {
  events: EventWithFacts[];
  onSelectEvent: (eventId: string) => void;
}

export function VehicleHealthDashboard({ events, onSelectEvent }: VehicleHealthDashboardProps) {
  const health = useVehicleHealth(events);

  if (!health.hasAnyMaintenance) return null;

  const handleSystemClick = (sys: SystemKey) => {
    const sh = health.systems[sys];
    if (sh?.eventId) onSelectEvent(sh.eventId);
  };

  return (
    <Card className="mb-6 p-4 sm:p-5 border-[hsl(170,40%,80%)] bg-[hsl(170,55%,98%)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-[hsl(170,70%,35%)] rounded-full" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Vue d'ensemble mécanique
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
        <div className="lg:col-span-3 rounded-md bg-white border border-border p-2">
          <VehicleSchematic systems={health.systems} onSystemClick={handleSystemClick} />
        </div>
        <div className="lg:col-span-2">
          <HealthKPIs kpis={health.kpis} />
        </div>
      </div>

      <div className="mt-4">
        <SystemStatusBar systems={health.systems} onSystemClick={handleSystemClick} />
      </div>
    </Card>
  );
}
