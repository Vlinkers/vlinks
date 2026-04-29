import { useMemo } from "react";
import { differenceInDays } from "date-fns";
import type { EventWithFacts } from "@/hooks/useVinDossier";
import {
  getMaintenanceData,
  SYSTEM_LABELS,
  type MaintenanceData,
  type SystemEntry,
  type SystemKey,
} from "@/lib/maintenanceLogTypes";

export type HealthStatus = "green" | "yellow" | "red" | "grey";

export interface SystemHealth {
  system: SystemKey;
  label: string;
  status: HealthStatus;
  wearPercentage?: number;
  lastIntervention?: {
    type: string;
    date: Date | null;
    description: string;
  };
  eventId?: string;
}

export interface VehicleHealthData {
  systems: Partial<Record<SystemKey, SystemHealth>>;
  hasAnyMaintenance: boolean;
  kpis: {
    lastMaintenanceDate: Date | null;
    currentKm: number | null;
    documentedSystems: number;
    totalSystems: number;
    nextScheduled: { systemLabel: string; date?: Date; km?: number } | null;
    globalScore: number; // 0-100
  };
}

// All "trackable" systems we display in the schematic / status bar
const TRACKED_SYSTEMS: SystemKey[] = [
  "pneus", "freins", "huile_moteur", "moteur",
  "transmission", "batterie", "suspension",
  "echappement", "climatisation", "eclairage",
];

interface SystemEntryWithCtx {
  entry: SystemEntry;
  date: Date | null;
  mileage: number | null;
  eventId: string;
  data: MaintenanceData;
}

function pickWearForSystem(entry: SystemEntry): number | undefined {
  const d = (entry.details ?? {}) as Record<string, unknown>;
  const candidates = [
    "summer_wear_pct", "winter_wear_pct",
    "front_pads_pct", "rear_pads_pct",
    "wear_pct",
  ];
  const vals: number[] = [];
  for (const k of candidates) {
    const v = d[k];
    if (typeof v === "number" && !Number.isNaN(v)) vals.push(v);
  }
  if (vals.length === 0) return undefined;
  return Math.min(...vals);
}

function statusFromWear(pct: number): HealthStatus {
  if (pct >= 60) return "green";
  if (pct >= 30) return "yellow";
  return "red";
}

function statusFromAge(date: Date | null): HealthStatus {
  if (!date) return "yellow";
  const days = differenceInDays(new Date(), date);
  if (days < 180) return "green";
  if (days < 365) return "yellow";
  return "red";
}

function scoreOf(status: HealthStatus): number | null {
  if (status === "green") return 100;
  if (status === "yellow") return 50;
  if (status === "red") return 10;
  return null;
}

export function useVehicleHealth(events: EventWithFacts[]): VehicleHealthData {
  return useMemo(() => {
    // Collect all maintenance entries grouped by system
    const bySystem = new Map<SystemKey, SystemEntryWithCtx[]>();
    let hasAnyMaintenance = false;
    let lastMaintenanceDate: Date | null = null;
    let currentKm: number | null = null;
    let nextScheduled: VehicleHealthData["kpis"]["nextScheduled"] = null;

    // Sort events by date desc to make "latest" extraction easy
    const sorted = [...events].sort((a, b) => {
      const da = a.event.event_date ? new Date(a.event.event_date).getTime() : 0;
      const db = b.event.event_date ? new Date(b.event.event_date).getTime() : 0;
      return db - da;
    });

    for (const ewf of sorted) {
      for (const f of ewf.facts) {
        const md = getMaintenanceData(f.fact.metadata);
        if (!md) continue;
        hasAnyMaintenance = true;
        const date = ewf.event.event_date ? new Date(ewf.event.event_date) : null;
        const mileage = ewf.event.mileage_at_event ?? null;

        if (date && (!lastMaintenanceDate || date > lastMaintenanceDate)) {
          lastMaintenanceDate = date;
        }
        if (mileage != null && currentKm == null) {
          currentKm = mileage;
        }

        for (const sysEntry of md.systems ?? []) {
          const list = bySystem.get(sysEntry.system) ?? [];
          list.push({ entry: sysEntry, date, mileage, eventId: ewf.event.id, data: md });
          bySystem.set(sysEntry.system, list);

          // Detect future maintenance from oil details
          const det = (sysEntry.details ?? {}) as Record<string, unknown>;
          const nextKm = typeof det.next_change_km === "number" ? det.next_change_km : null;
          const nextMonths = typeof det.next_change_months === "number" ? det.next_change_months : null;
          if ((nextKm || nextMonths) && !nextScheduled) {
            const targetKm = nextKm && mileage != null ? mileage + nextKm : undefined;
            let targetDate: Date | undefined;
            if (nextMonths && date) {
              targetDate = new Date(date);
              targetDate.setMonth(targetDate.getMonth() + nextMonths);
            }
            nextScheduled = {
              systemLabel: SYSTEM_LABELS[sysEntry.system] ?? sysEntry.system,
              km: targetKm,
              date: targetDate,
            };
          }
        }
      }
    }

    // Build per-system health (only the latest entry counts for status)
    const systems: Partial<Record<SystemKey, SystemHealth>> = {};
    let totalScore = 0;
    let scored = 0;

    for (const sys of TRACKED_SYSTEMS) {
      const entries = bySystem.get(sys);
      if (!entries || entries.length === 0) {
        systems[sys] = {
          system: sys,
          label: SYSTEM_LABELS[sys] ?? sys,
          status: "grey",
        };
        continue;
      }
      // entries are appended in date-desc order, so first is latest
      const latest = entries[0];
      const wear = pickWearForSystem(latest.entry);
      const status: HealthStatus = wear != null ? statusFromWear(wear) : statusFromAge(latest.date);
      const interventionType = latest.entry.intervention_type ?? "Intervention";
      const description = latest.data.extra_note ?? "";

      systems[sys] = {
        system: sys,
        label: SYSTEM_LABELS[sys] ?? sys,
        status,
        wearPercentage: wear,
        lastIntervention: {
          type: interventionType,
          date: latest.date,
          description,
        },
        eventId: latest.eventId,
      };

      const s = scoreOf(status);
      if (s != null) {
        totalScore += s;
        scored += 1;
      }
    }

    const documentedSystems = Object.values(systems).filter(
      (s) => s && s.status !== "grey"
    ).length;
    const globalScore = scored > 0 ? Math.round(totalScore / scored) : 0;

    return {
      systems,
      hasAnyMaintenance,
      kpis: {
        lastMaintenanceDate,
        currentKm,
        documentedSystems,
        totalSystems: TRACKED_SYSTEMS.length,
        nextScheduled,
        globalScore,
      },
    };
  }, [events]);
}

export const TRACKED_SYSTEM_KEYS = TRACKED_SYSTEMS;
