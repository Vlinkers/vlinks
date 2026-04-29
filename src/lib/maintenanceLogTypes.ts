// Schema for digital maintenance logbook entries.
// Stored in facts.metadata.maintenance — additive, optional.

export type VisitType =
  | "entretien_regulier"
  | "probleme_alerte"
  | "rappel_constructeur"
  | "modification"
  | "inspection_controle";

export const VISIT_TYPE_OPTIONS: { value: VisitType; label: string; icon: string; description: string }[] = [
  { value: "entretien_regulier", label: "Entretien régulier", icon: "🔧", description: "Vidange, pneus, filtres, inspection périodique…" },
  { value: "probleme_alerte", label: "Problème / Alerte", icon: "⚠️", description: "Check engine, bruit, voyant, panne…" },
  { value: "rappel_constructeur", label: "Rappel constructeur", icon: "🛡️", description: "Campagne de rappel officielle du fabricant" },
  { value: "modification", label: "Modification", icon: "🎨", description: "Accessoire, performance, esthétique…" },
  { value: "inspection_controle", label: "Inspection / Contrôle", icon: "📋", description: "Inspection mécanique, SAAQ, PPI…" },
];

export const VISIT_TYPE_LABELS: Record<VisitType, string> =
  Object.fromEntries(VISIT_TYPE_OPTIONS.map((o) => [o.value, o.label])) as Record<VisitType, string>;

export type SystemKey =
  | "moteur" | "transmission" | "echappement" | "turbo"
  | "pneus" | "freins" | "suspension" | "direction" | "roulements"
  | "batterie" | "alternateur" | "demarreur" | "allumage" | "eclairage"
  | "huile_moteur" | "liquide_refroidissement" | "liquide_frein" | "liquide_transmission"
  | "carrosserie" | "vitres" | "climatisation" | "chauffage" | "sieges"
  | "autre";

export interface SystemGroup {
  label: string;
  systems: { key: SystemKey; label: string }[];
}

export const SYSTEM_GROUPS: SystemGroup[] = [
  {
    label: "Motopropulseur",
    systems: [
      { key: "moteur", label: "Moteur" },
      { key: "transmission", label: "Transmission" },
      { key: "echappement", label: "Échappement" },
      { key: "turbo", label: "Turbo / Compresseur" },
    ],
  },
  {
    label: "Trains roulants",
    systems: [
      { key: "pneus", label: "Pneus" },
      { key: "freins", label: "Freins" },
      { key: "suspension", label: "Suspension" },
      { key: "direction", label: "Direction" },
      { key: "roulements", label: "Roulements" },
    ],
  },
  {
    label: "Électrique",
    systems: [
      { key: "batterie", label: "Batterie" },
      { key: "alternateur", label: "Alternateur" },
      { key: "demarreur", label: "Démarreur" },
      { key: "allumage", label: "Allumage (bobines/bougies)" },
      { key: "eclairage", label: "Éclairage" },
    ],
  },
  {
    label: "Fluides",
    systems: [
      { key: "huile_moteur", label: "Huile moteur" },
      { key: "liquide_refroidissement", label: "Liquide refroidissement" },
      { key: "liquide_frein", label: "Liquide de frein" },
      { key: "liquide_transmission", label: "Liquide transmission" },
    ],
  },
  {
    label: "Carrosserie / Habitacle",
    systems: [
      { key: "carrosserie", label: "Carrosserie" },
      { key: "vitres", label: "Vitres / Pare-brise" },
      { key: "climatisation", label: "Climatisation" },
      { key: "chauffage", label: "Chauffage" },
      { key: "sieges", label: "Sièges" },
    ],
  },
  {
    label: "Autre",
    systems: [{ key: "autre", label: "Autre (préciser)" }],
  },
];

export const SYSTEM_LABELS: Record<SystemKey, string> = (() => {
  const m = {} as Record<SystemKey, string>;
  for (const g of SYSTEM_GROUPS) for (const s of g.systems) m[s.key] = s.label;
  return m;
})();

// Detailed (priority) systems get rich UI; others use a generic block.
export const PRIORITY_SYSTEMS: SystemKey[] = [
  "pneus", "freins", "huile_moteur", "moteur",
  "transmission", "batterie", "suspension", "climatisation", "allumage",
];

export interface SystemEntry {
  system: SystemKey;
  intervention_type?: string;
  details?: Record<string, unknown>;
  mechanic_note?: string;
  // Free-text label for "autre" systems
  custom_label?: string;
}

export type PerformedBy = "concessionnaire" | "garage_independant" | "moi_meme" | "autre";

export const PERFORMED_BY_OPTIONS: { value: PerformedBy; label: string }[] = [
  { value: "concessionnaire", label: "Concessionnaire" },
  { value: "garage_independant", label: "Garage indépendant" },
  { value: "moi_meme", label: "Moi-même" },
  { value: "autre", label: "Autre" },
];

export const PERFORMED_BY_LABELS: Record<PerformedBy, string> =
  Object.fromEntries(PERFORMED_BY_OPTIONS.map((o) => [o.value, o.label])) as Record<PerformedBy, string>;

export interface MaintenanceData {
  visit_type: VisitType;
  systems: SystemEntry[];
  performed_by?: PerformedBy;
  garage_name?: string;
  cost?: number | null;
  cost_visible?: boolean;
  extra_note?: string;
}

// Build an auto-title from systems + visit type
export function buildMaintenanceTitle(data: MaintenanceData): string {
  const sysNames = data.systems
    .map((s) => (s.system === "autre" && s.custom_label ? s.custom_label : SYSTEM_LABELS[s.system]))
    .filter(Boolean);
  const sysLabel = sysNames.length === 0
    ? "Entrée du carnet"
    : sysNames.length <= 2
      ? sysNames.join(" + ")
      : `${sysNames.slice(0, 2).join(" + ")} +${sysNames.length - 2}`;
  return `${sysLabel} — ${VISIT_TYPE_LABELS[data.visit_type]}`;
}

// Type-guard: does a fact.metadata blob carry a maintenance log entry?
export function getMaintenanceData(metadata: unknown): MaintenanceData | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = (metadata as Record<string, unknown>).maintenance;
  if (!m || typeof m !== "object") return null;
  const md = m as Record<string, unknown>;
  if (typeof md.visit_type !== "string" || !Array.isArray(md.systems)) return null;
  return md as unknown as MaintenanceData;
}

// Field configs for priority systems (used by the form)
export interface SystemFieldDef {
  key: string;
  label: string;
  kind: "select" | "slider" | "text" | "textarea" | "number" | "radio" | "checkboxes";
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
}

export interface SystemSchema {
  intervention: { label: string; options: { value: string; label: string }[] } | null;
  fields: SystemFieldDef[];
}

export const SYSTEM_SCHEMAS: Partial<Record<SystemKey, SystemSchema>> = {
  pneus: {
    intervention: {
      label: "Type d'intervention",
      options: [
        { value: "rotation", label: "Rotation" },
        { value: "changement_saisonnier", label: "Changement saisonnier" },
        { value: "remplacement_usure", label: "Remplacement usure" },
        { value: "reparation_crevaison", label: "Réparation crevaison" },
        { value: "equilibrage", label: "Équilibrage" },
        { value: "autre", label: "Autre" },
      ],
    },
    fields: [
      { key: "summer_brand", label: "Pneus d'été — marque/modèle", kind: "text", placeholder: "ex. Continental PremiumContact 6" },
      { key: "summer_wear_pct", label: "Pneus d'été — usure restante", kind: "slider", unit: "%" },
      { key: "winter_brand", label: "Pneus d'hiver — marque/modèle", kind: "text", placeholder: "ex. Michelin X-Ice" },
      { key: "winter_wear_pct", label: "Pneus d'hiver — usure restante", kind: "slider", unit: "%" },
    ],
  },
  freins: {
    intervention: {
      label: "Type d'intervention",
      options: [
        { value: "inspection", label: "Inspection" },
        { value: "plaquettes", label: "Changement plaquettes" },
        { value: "disques", label: "Changement disques" },
        { value: "plaquettes_disques", label: "Changement plaquettes + disques" },
        { value: "purge_liquide", label: "Purge liquide" },
        { value: "autre", label: "Autre" },
      ],
    },
    fields: [
      { key: "front_pads_pct", label: "État plaquettes avant", kind: "slider", unit: "%" },
      { key: "rear_pads_pct", label: "État plaquettes arrière", kind: "slider", unit: "%" },
      {
        key: "disc_condition", label: "État disques", kind: "radio",
        options: [
          { value: "bon", label: "Bon" },
          { value: "use", label: "Usé" },
          { value: "a_remplacer", label: "À remplacer" },
        ],
      },
    ],
  },
  huile_moteur: {
    intervention: {
      label: "Type d'intervention",
      options: [
        { value: "vidange_complete", label: "Vidange complète" },
        { value: "appoint", label: "Appoint" },
        { value: "verification_niveau", label: "Vérification niveau" },
      ],
    },
    fields: [
      { key: "oil_type", label: "Type d'huile", kind: "text", placeholder: "ex. 5W-40 Mobil 1" },
      { key: "next_change_km", label: "Prochaine vidange dans", kind: "number", unit: "km" },
      { key: "next_change_months", label: "ou dans", kind: "number", unit: "mois" },
    ],
  },
  moteur: {
    intervention: {
      label: "Nature de l'intervention",
      options: [
        // Combined list — used regardless of visit type to keep the form simple
        { value: "voyant_check_engine", label: "Voyant check engine" },
        { value: "bruit_anormal", label: "Bruit anormal" },
        { value: "perte_puissance", label: "Perte de puissance" },
        { value: "fumee", label: "Fumée anormale" },
        { value: "vibration", label: "Vibration" },
        { value: "surchauffe", label: "Surchauffe" },
        { value: "courroie_distribution", label: "Courroie distribution" },
        { value: "courroie_accessoire", label: "Courroie accessoire" },
        { value: "joint_culasse", label: "Joint de culasse" },
        { value: "bougies", label: "Bougies" },
        { value: "bobines", label: "Bobines" },
        { value: "autre", label: "Autre" },
      ],
    },
    fields: [
      { key: "obd_code", label: "Code erreur OBD", kind: "text", placeholder: "ex. P0301" },
      { key: "diagnosis", label: "Diagnostic du garagiste", kind: "textarea" },
      {
        key: "status", label: "Statut", kind: "radio",
        options: [
          { value: "resolu", label: "Résolu" },
          { value: "diagnostique_non_repare", label: "Diagnostiqué — non réparé" },
          { value: "attente_piece", label: "En attente de pièce" },
          { value: "sous_surveillance", label: "Sous surveillance" },
        ],
      },
      { key: "next_planned", label: "Prochaine intervention prévue", kind: "text" },
    ],
  },
  transmission: {
    intervention: {
      label: "Type",
      options: [
        { value: "vidange_boite", label: "Vidange boîte" },
        { value: "embrayage", label: "Embrayage" },
        { value: "autre", label: "Autre" },
      ],
    },
    fields: [],
  },
  batterie: {
    intervention: {
      label: "Type",
      options: [
        { value: "remplacement", label: "Remplacement" },
        { value: "test", label: "Test / Vérification" },
        { value: "recharge", label: "Recharge" },
      ],
    },
    fields: [
      { key: "brand", label: "Marque / modèle", kind: "text" },
    ],
  },
  suspension: {
    intervention: {
      label: "Type",
      options: [
        { value: "amortisseurs", label: "Amortisseurs" },
        { value: "ressorts", label: "Ressorts" },
        { value: "bras_suspension", label: "Bras de suspension" },
        { value: "barre_stabilisatrice", label: "Barre stabilisatrice" },
        { value: "silentblocs", label: "Silentblocs" },
        { value: "autre", label: "Autre" },
      ],
    },
    fields: [
      {
        key: "locations", label: "Localisation", kind: "checkboxes",
        options: [
          { value: "av_g", label: "Avant gauche" },
          { value: "av_d", label: "Avant droit" },
          { value: "ar_g", label: "Arrière gauche" },
          { value: "ar_d", label: "Arrière droit" },
        ],
      },
    ],
  },
  climatisation: {
    intervention: {
      label: "Type",
      options: [
        { value: "recharge_gaz", label: "Recharge gaz" },
        { value: "remplacement_compresseur", label: "Remplacement compresseur" },
        { value: "nettoyage", label: "Nettoyage" },
        { value: "autre", label: "Autre" },
      ],
    },
    fields: [],
  },
  allumage: {
    intervention: {
      label: "Type",
      options: [
        { value: "bougies", label: "Bougies" },
        { value: "bobines", label: "Bobines" },
        { value: "bougies_bobines", label: "Bougies + Bobines" },
        { value: "fils", label: "Fils" },
        { value: "autre", label: "Autre" },
      ],
    },
    fields: [],
  },
};

export function wearColor(pct: number): string {
  if (pct >= 60) return "hsl(142, 70%, 42%)"; // green
  if (pct >= 30) return "hsl(45, 90%, 50%)"; // amber
  return "hsl(0, 75%, 55%)"; // red
}
