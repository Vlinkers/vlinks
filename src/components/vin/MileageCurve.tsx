import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceArea, ReferenceLine, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Gauge } from "lucide-react";
import type { EventWithFacts, VehiclePhase, RedFlag } from "@/hooks/useVinDossier";

// ── Props ───────────────────────────────────────────────

export interface TimelineMarker {
  id: string;
  ts: number;
  kind: "ownership" | "price" | "inspection";
  label: string;
  value?: number;
}

interface MileageCurveProps {
  events: EventWithFacts[];
  phases: VehiclePhase[];
  redFlags: RedFlag[];
  onEventClick?: (eventId: string) => void;
  markers?: TimelineMarker[];
}

// ── Types ───────────────────────────────────────────────

interface DataPoint {
  ts: number;
  date: Date;
  mileage: number;
  label: string;
  eventId: string;
  eventType: string;
  title: string;
  anomaly?: "decrease" | "jump";
}

// ── Config ──────────────────────────────────────────────

const AVG_KM_YEAR = 15_000;
const HIGH_KM_YEAR = 25_000;
const LOW_KM_YEAR = 5_000;
const JUMP_THRESHOLD = 30_000;

const EVENT_LABELS: Record<string, string> = {
  purchase: "Achat", sale: "Vente", accident: "Accident", repair: "Réparation",
  maintenance: "Entretien", inspection: "Inspection", modification: "Modification",
  recall: "Rappel", insurance_claim: "Réclamation", listing: "Mise en vente",
  import_export: "Import/Export", registration: "Immatriculation",
  mileage_record: "Relevé km", other: "Autre",
};

const PHASE_COLORS = [
  "hsl(224, 78%, 47%, 0.06)",
  "hsl(152, 69%, 38%, 0.06)",
  "hsl(32, 95%, 52%, 0.06)",
  "hsl(262, 60%, 55%, 0.06)",
  "hsl(0, 84%, 60%, 0.06)",
];

// ── Helpers ─────────────────────────────────────────────

function msPerYear(years: number): number {
  return years * 365.25 * 24 * 60 * 60 * 1000;
}

function corridorAt(firstTs: number, firstKm: number, ts: number, rate: number): number {
  const yearsElapsed = (ts - firstTs) / msPerYear(1);
  return Math.round(firstKm + yearsElapsed * rate);
}

// ── Custom tooltip ──────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as DataPoint;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md px-3 py-2 text-xs space-y-0.5 max-w-[200px]">
      <p className="font-semibold">{format(d.date, "d MMMM yyyy", { locale: fr })}</p>
      <p className="text-muted-foreground">{EVENT_LABELS[d.eventType] ?? d.eventType}</p>
      <p className="truncate">{d.title}</p>
      <p className="font-medium">{d.mileage.toLocaleString("fr-CA")} km</p>
      {d.anomaly === "decrease" && (
        <p className="text-destructive font-semibold">⚠ Recul d'odomètre</p>
      )}
      {d.anomaly === "jump" && (
        <p className="text-[hsl(32,95%,52%)] font-semibold">⚠ Saut anormal</p>
      )}
    </div>
  );
}

// ── Custom dot ──────────────────────────────────────────

function CustomDot(props: any) {
  const { cx, cy, payload, onClick } = props;
  if (cx == null || cy == null) return null;
  const d = payload as DataPoint;

  const fill = d.anomaly === "decrease"
    ? "hsl(0, 84%, 60%)"
    : d.anomaly === "jump"
      ? "hsl(32, 95%, 52%)"
      : "hsl(152, 44%, 28%)";

  const r = d.anomaly ? 6 : 4;

  return (
    <g onClick={() => onClick?.(d.eventId)} className="cursor-pointer">
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="white" strokeWidth={2} />
      {d.anomaly && (
        <text
          x={cx}
          y={cy - r - 6}
          textAnchor="middle"
          className="text-[9px] font-semibold fill-destructive"
        >
          ⚠ {d.anomaly === "decrease" ? "Recul" : "Saut"}
        </text>
      )}
    </g>
  );
}

// ── Main component ──────────────────────────────────────

export function MileageCurve({ events, phases, redFlags, onEventClick }: MileageCurveProps) {
  const { points, phaseAreas } = useMemo(() => {
    // Build sorted data points
    const raw = events
      .filter((e) => e.event.mileage_at_event != null && e.event.event_date)
      .map((e) => ({
        ts: new Date(e.event.event_date!).getTime(),
        date: new Date(e.event.event_date!),
        mileage: e.event.mileage_at_event!,
        label: format(new Date(e.event.event_date!), "MMM yyyy", { locale: fr }),
        eventId: e.event.id,
        eventType: e.event.event_type,
        title: e.event.title,
      }))
      .sort((a, b) => a.ts - b.ts);

    // Detect anomalies
    const pts: DataPoint[] = raw.map((p, i) => {
      if (i === 0) return { ...p };
      const prev = raw[i - 1];
      const daysBetween = (p.ts - prev.ts) / (1000 * 60 * 60 * 24);
      if (p.mileage < prev.mileage) return { ...p, anomaly: "decrease" as const };
      if (p.mileage - prev.mileage > JUMP_THRESHOLD && daysBetween < 365)
        return { ...p, anomaly: "jump" as const };
      return { ...p };
    });

    // Phase background areas
    const areas = phases
      .filter((p) => p.start_date)
      .map((p, i) => ({
        id: p.id,
        x1: new Date(p.start_date!).getTime(),
        x2: p.end_date ? new Date(p.end_date).getTime() : Date.now(),
        color: PHASE_COLORS[i % PHASE_COLORS.length],
        label: p.phase_type === "ownership"
          ? "Propriétaire"
          : p.phase_type === "dealer_inventory"
            ? "Concessionnaire"
            : p.phase_type,
      }));

    return { points: pts, phaseAreas: areas };
  }, [events, phases]);

  // Empty state
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-6 text-center">
        <Gauge size={32} className="mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Pas assez de relevés kilométriques pour tracer la courbe.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Contribuez un relevé pour alimenter ce graphique.
        </p>
      </div>
    );
  }

  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const domainMin = firstPt.ts;
  const domainMax = lastPt.ts;
  const mileageMax = Math.max(...points.map((p) => p.mileage));
  const corridorHigh = corridorAt(domainMin, firstPt.mileage, domainMax, HIGH_KM_YEAR);
  const yMax = Math.max(mileageMax, corridorHigh) * 1.1;

  // Corridor reference lines data
  const corridorPoints = [domainMin, domainMax].map((ts) => ({
    ts,
    low: corridorAt(domainMin, firstPt.mileage, ts, LOW_KM_YEAR),
    avg: corridorAt(domainMin, firstPt.mileage, ts, AVG_KM_YEAR),
    high: corridorAt(domainMin, firstPt.mileage, ts, HIGH_KM_YEAR),
  }));

  return (
    <div className="space-y-2">
      <div className="h-[280px] sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 16, right: 12, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

            {/* Phase background bands */}
            {phaseAreas.map((area) => (
              <ReferenceArea
                key={area.id}
                x1={Math.max(area.x1, domainMin)}
                x2={Math.min(area.x2, domainMax)}
                fill={area.color}
                fillOpacity={1}
                label={{ value: area.label, position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
            ))}

            {/* Corridor dashed lines */}
            <ReferenceLine
              segment={[
                { x: corridorPoints[0].ts, y: corridorPoints[0].low },
                { x: corridorPoints[1].ts, y: corridorPoints[1].low },
              ]}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
            <ReferenceLine
              segment={[
                { x: corridorPoints[0].ts, y: corridorPoints[0].avg },
                { x: corridorPoints[1].ts, y: corridorPoints[1].avg },
              ]}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="6 3"
              strokeOpacity={0.3}
            />
            <ReferenceLine
              segment={[
                { x: corridorPoints[0].ts, y: corridorPoints[0].high },
                { x: corridorPoints[1].ts, y: corridorPoints[1].high },
              ]}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />

            <XAxis
              dataKey="ts"
              type="number"
              domain={[domainMin, domainMax]}
              tickFormatter={(ts) => format(new Date(ts), "MMM yy", { locale: fr })}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              domain={[0, yMax]}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              width={42}
            />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="mileage"
              stroke="hsl(152, 44%, 28%)"
              strokeWidth={2}
              dot={<CustomDot onClick={onEventClick} />}
              activeDot={{ r: 6, stroke: "hsl(152, 44%, 28%)", strokeWidth: 2, fill: "white" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground px-2">
        <span className="inline-flex items-center gap-1">
          <span className="w-4 h-0.5 bg-[hsl(152,44%,28%)] inline-block" /> Kilométrage réel
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-4 h-0.5 border-t border-dashed border-muted-foreground inline-block" /> Corridor attendu (5k–25k km/an)
        </span>
        {points.some((p) => p.anomaly) && (
          <span className="inline-flex items-center gap-1 text-destructive">
            <AlertTriangle size={10} /> Anomalie détectée
          </span>
        )}
      </div>
    </div>
  );
}
