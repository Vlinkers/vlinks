import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SystemHealth, HealthStatus } from "@/hooks/useVehicleHealth";
import type { SystemKey } from "@/lib/maintenanceLogTypes";

interface VehicleSchematicProps {
  systems: Partial<Record<SystemKey, SystemHealth>>;
  onSystemClick: (sys: SystemKey) => void;
}

const STATUS_FILL: Record<HealthStatus, string> = {
  green: "rgba(34, 197, 94, 0.45)",
  yellow: "rgba(234, 179, 8, 0.45)",
  red: "rgba(239, 68, 68, 0.45)",
  grey: "rgba(156, 163, 175, 0.20)",
};

const STATUS_STROKE: Record<HealthStatus, string> = {
  green: "rgba(22, 163, 74, 0.9)",
  yellow: "rgba(202, 138, 4, 0.9)",
  red: "rgba(220, 38, 38, 0.9)",
  grey: "rgba(107, 114, 128, 0.5)",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  green: "Bon",
  yellow: "À surveiller",
  red: "Attention requise",
  grey: "Pas de données",
};

interface ZoneProps {
  systemKey: SystemKey;
  systems: Partial<Record<SystemKey, SystemHealth>>;
  onClick: (sys: SystemKey) => void;
  children: React.ReactNode;
  ariaLabel: string;
}

function Zone({ systemKey, systems, onClick, children, ariaLabel }: ZoneProps) {
  const sh = systems[systemKey];
  const status: HealthStatus = sh?.status ?? "grey";
  const tip = (
    <div className="text-xs">
      <p className="font-semibold mb-0.5">{sh?.label ?? systemKey}</p>
      <p className="text-muted-foreground">{STATUS_LABEL[status]}</p>
      {sh?.wearPercentage != null && (
        <p className="text-muted-foreground">Usure restante : {sh.wearPercentage}%</p>
      )}
      {sh?.lastIntervention?.date && (
        <p className="text-muted-foreground">
          Dernière : {sh.lastIntervention.type} ·{" "}
          {sh.lastIntervention.date.toLocaleDateString("fr-CA")}
        </p>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <g
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            onClick={() => onClick(systemKey)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(systemKey);
              }
            }}
            className="cursor-pointer outline-none transition-opacity hover:opacity-90 focus-visible:opacity-100"
            style={{
              fill: STATUS_FILL[status],
              stroke: STATUS_STROKE[status],
              strokeWidth: 1.5,
            }}
          >
            {children}
          </g>
        </TooltipTrigger>
        <TooltipContent side="top">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function VehicleSchematic({ systems, onSystemClick }: VehicleSchematicProps) {
  return (
    <svg
      viewBox="0 0 800 350"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      role="img"
      aria-label="Schéma interactif du véhicule"
    >
      {/* Ground line */}
      <line x1="40" y1="290" x2="760" y2="290" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />

      {/* Vehicle body — SUV silhouette (Cayenne-like) */}
      <g fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5">
        {/* Lower body */}
        <path d="
          M 90,265
          L 90,220
          Q 95,200 130,195
          L 200,180
          Q 240,140 320,130
          L 520,130
          Q 580,135 620,170
          L 690,185
          Q 720,195 720,220
          L 720,265
          Z
        " />
        {/* Roof curve highlight */}
        <path d="M 240,135 Q 320,118 520,118 Q 590,122 625,160" fill="none" stroke="#9CA3AF" strokeWidth="1" />
        {/* Window line */}
        <path d="M 250,150 L 320,140 L 520,140 L 590,160 L 590,180 L 250,180 Z" fill="#F3F4F6" stroke="#CBD5E1" />
        {/* Door divider */}
        <line x1="395" y1="140" x2="395" y2="265" stroke="#CBD5E1" strokeWidth="1" />
        {/* Door handles */}
        <rect x="330" y="195" width="20" height="3" rx="1" fill="#CBD5E1" stroke="none" />
        <rect x="445" y="195" width="20" height="3" rx="1" fill="#CBD5E1" stroke="none" />
      </g>

      {/* Wheel wells */}
      <circle cx="180" cy="265" r="38" fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="1.5" />
      <circle cx="620" cy="265" r="38" fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="1.5" />

      {/* === Interactive zones (overlays on top of silhouette) === */}

      {/* PNEUS — both wheels */}
      <Zone systemKey="pneus" systems={systems} onClick={onSystemClick} ariaLabel="Pneus">
        <circle cx="180" cy="265" r="32" />
        <circle cx="620" cy="265" r="32" />
      </Zone>

      {/* FREINS — disc inside wheels */}
      <Zone systemKey="freins" systems={systems} onClick={onSystemClick} ariaLabel="Freins">
        <circle cx="180" cy="265" r="16" />
        <circle cx="620" cy="265" r="16" />
      </Zone>

      {/* MOTEUR — front engine bay */}
      <Zone systemKey="moteur" systems={systems} onClick={onSystemClick} ariaLabel="Moteur">
        <rect x="615" y="195" width="80" height="55" rx="6" />
      </Zone>

      {/* HUILE_MOTEUR — under engine (oil pan) */}
      <Zone systemKey="huile_moteur" systems={systems} onClick={onSystemClick} ariaLabel="Huile moteur">
        <rect x="630" y="252" width="60" height="14" rx="4" />
      </Zone>

      {/* TRANSMISSION — central underbody */}
      <Zone systemKey="transmission" systems={systems} onClick={onSystemClick} ariaLabel="Transmission">
        <rect x="380" y="255" width="220" height="14" rx="4" />
      </Zone>

      {/* BATTERIE — small box in engine bay */}
      <Zone systemKey="batterie" systems={systems} onClick={onSystemClick} ariaLabel="Batterie">
        <rect x="660" y="195" width="28" height="20" rx="3" />
      </Zone>

      {/* SUSPENSION — anchors at wheels */}
      <Zone systemKey="suspension" systems={systems} onClick={onSystemClick} ariaLabel="Suspension">
        <rect x="170" y="225" width="20" height="22" rx="3" />
        <rect x="610" y="225" width="20" height="22" rx="3" />
      </Zone>

      {/* ECHAPPEMENT — line from middle to rear */}
      <Zone systemKey="echappement" systems={systems} onClick={onSystemClick} ariaLabel="Échappement">
        <rect x="100" y="260" width="280" height="8" rx="3" />
        <circle cx="98" cy="264" r="6" />
      </Zone>

      {/* CLIMATISATION — behind grille */}
      <Zone systemKey="climatisation" systems={systems} onClick={onSystemClick} ariaLabel="Climatisation">
        <rect x="697" y="200" width="18" height="40" rx="3" />
      </Zone>

      {/* ECLAIRAGE — front & rear lights */}
      <Zone systemKey="eclairage" systems={systems} onClick={onSystemClick} ariaLabel="Éclairage">
        <rect x="700" y="180" width="22" height="14" rx="3" />
        <rect x="92" y="200" width="14" height="18" rx="3" />
      </Zone>
    </svg>
  );
}
