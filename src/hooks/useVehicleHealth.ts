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
  /** Reason override for the indicator (problem unresolved, overdue, etc.) */
  alertReason?: "unresolved_problem" | "resolved_problem" | "overdue" | null;
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
    nextScheduled: { systemLabel: string; date?: Date; km?: number; rawText?: string } | null;
    globalScore: number; // 0-100
  };
}

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

/** Try to parse a date out of a free-text "next planned" string (FR/EN month names or ISO). */
function parseLooseDate(raw: unknown): Date | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO YYYY-MM-DD
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (!isNaN(d.getTime())) return d;
  }
  // FR month names: "7 mai", "7 mai 2026", "mai 2026"
  const months: Record<string, number> = {
    janvier: 0, fevrier: 1, "février": 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, aout: 7, "août": 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11, "décembre": 11,
    january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const lower = s.toLowerCase();
  const m = lower.match(/(?:(\d{1,2})\s+)?([a-zà-ÿ]+)(?:\s+(\d{4}))?/i);
  if (m) {
    const day = m[1] ? Number(m[1]) : 1;
    const monthIdx = months[m[2]];
    if (monthIdx != null) {
      const now = new Date();
      let year = m[3] ? Number(m[3]) : now.getFullYear();
      const candidate = new Date(year, monthIdx, day);
      // If no explicit year and date already passed, assume next year
      if (!m[3] && candidate < now) {
        candidate.setFullYear(year + 1);
      }
      if (!isNaN(candidate.getTime())) return candidate;
    }
  }
  return null;
}

function parseLooseKm(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return null;
  const m = raw.replace(/\s/g, "").match(/(\d{4,7})/);
  return m ? Number(m[1]) : null;
}

interface ScheduledCandidate {
  systemLabel: string;
  date?: Date;
  km?: number;
  rawText?: string;
  /** Sortable timestamp (ms). Smaller = sooner. */
  sortKey: number;
}

function collectScheduledCandidates(
  ewf: SystemEntryWithCtx,
  sysLabel: string,
  candidates: ScheduledCandidate[]
) {
  const det = (ewf.entry.details ?? {}) as Record<string, unknown>;
  const now = Date.now();

  // Generic next planned date fields
  const dateKeys = ["next_planned_date", "next_planned", "prochaine_date", "next_date"];
  for (const k of dateKeys) {
    const d = parseLooseDate(det[k]);
    if (d && d.getTime() > now) {
      candidates.push({
        systemLabel: sysLabel,
        date: d,
        rawText: typeof det[k] === "string" ? (det[k] as string) : undefined,
        sortKey: d.getTime(),
      });
    }
  }

  // Generic km-based planning
  const kmKeys = ["next_planned_km", "prochaine_km"];
  for (const k of kmKeys) {
    const km = parseLooseKm(det[k]);
    if (km != null && (ewf.mileage == null || km > ewf.mileage)) {
      candidates.push({
        systemLabel: sysLabel,
        km,
        sortKey: km * 1000, // approximate ordering — km plans rank after dated ones in same scan
      });
    }
  }

  // Oil-specific relative planning: next_change_km / next_change_months
  const nextKmRel = typeof det.next_change_km === "number" ? det.next_change_km : null;
  const nextMonthsRel = typeof det.next_change_months === "number" ? det.next_change_months : null;

  if (nextKmRel != null && ewf.mileage != null) {
    const targetKm = ewf.mileage + nextKmRel;
    candidates.push({
      systemLabel: sysLabel,
      km: targetKm,
      sortKey: now + nextKmRel * 100, // heuristic
    });
  }
  if (nextMonthsRel != null && ewf.date) {
    const target = new Date(ewf.date);
    target.setMonth(target.getMonth() + nextMonthsRel);
    if (target.getTime() > now) {
      candidates.push({
        systemLabel: sysLabel,
        date: target,
        sortKey: target.getTime(),
      });
    }
  }
}

/** Inspect "moteur" entry (problem visit) status to derive a hard health override. */
function problemStatusOverride(
  data: MaintenanceData,
  entry: SystemEntry
): { status: HealthStatus; reason: SystemHealth["alertReason"] } | null {
  if (data.visit_type !== "probleme_alerte") return null;
  const det = (entry.details ?? {}) as Record<string, unknown>;
  const status = typeof det.status === "string" ? det.status : null;

  // Resolved problem → green
  if (status === "resolu") {
    return { status: "green", reason: "resolved_problem" };
  }
  // Unresolved variants → red
  if (
    status === "diagnostique_non_repare" ||
    status === "attente_piece" ||
    status === "sous_surveillance" ||
    status == null // problem reported with no resolution status
  ) {
    return { status: "red", reason: "unresolved_problem" };
  }
  return null;
}

export function useVehicleHealth(events: EventWithFacts[]): VehicleHealthData {
  return useMemo(() => {
    const bySystem = new Map<SystemKey, SystemEntryWithCtx[]>();
    let hasAnyMaintenance = false;
    let lastMaintenanceDate: Date | null = null;
    let currentKm: number | null = null;
    const scheduledCandidates: ScheduledCandidate[] = [];

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
          const ctx: SystemEntryWithCtx = {
            entry: sysEntry,
            date,
            mileage,
            eventId: ewf.event.id,
            data: md,
          };
          const list = bySystem.get(sysEntry.system) ?? [];
          list.push(ctx);
          bySystem.set(sysEntry.system, list);

          const sysLabel = SYSTEM_LABELS[sysEntry.system] ?? sysEntry.system;
          collectScheduledCandidates(ctx, sysLabel, scheduledCandidates);
        }
      }
    }

    // Pick the soonest future scheduled candidate
    const nowMs = Date.now();
    const future = scheduledCandidates
      .filter((c) => (c.date ? c.date.getTime() > nowMs : true))
      .sort((a, b) => a.sortKey - b.sortKey);
    const nextScheduled = future.length > 0
      ? {
          systemLabel: future[0].systemLabel,
          date: future[0].date,
          km: future[0].km,
          rawText: future[0].rawText,
        }
      : null;

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
          alertReason: null,
        };
        continue;
      }
      const latest = entries[0];
      let status: HealthStatus;
      let alertReason: SystemHealth["alertReason"] = null;

      // Rule 1: Unresolved problem visit → red override
      const override = problemStatusOverride(latest.data, latest.entry);
      const wear = pickWearForSystem(latest.entry);

      if (override) {
        status = override.status;
        alertReason = override.reason;
      } else if (wear != null) {
        status = statusFromWear(wear);
      } else {
        status = statusFromAge(latest.date);
      }

      // Rule 2: Overdue scheduled date for this system → escalate to yellow if currently green
      const det = (latest.entry.details ?? {}) as Record<string, unknown>;
      for (const k of ["next_planned_date", "next_planned", "prochaine_date", "next_date"]) {
        const d = parseLooseDate(det[k]);
        if (d && d.getTime() < nowMs && status === "green") {
          status = "yellow";
          alertReason = "overdue";
          break;
        }
      }

      const interventionType = latest.entry.intervention_type ?? "Intervention";
      const description = latest.data.extra_note ?? "";

      systems[sys] = {
        system: sys,
        label: SYSTEM_LABELS[sys] ?? sys,
        status,
        wearPercentage: wear,
        alertReason,
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
