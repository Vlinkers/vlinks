// Schema + helpers for event-type-specific metadata stored in facts.metadata jsonb.
// Keep keys stable: they are persisted in the database.

export type FieldKind = "select" | "text" | "number" | "boolean";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  optional?: boolean;
  // For numeric fields: an associated boolean key controlling public visibility (toggle, default false)
  visibilityKey?: string;
  visibilityLabel?: string;
  placeholder?: string;
}

export const EVENT_TYPE_FIELDS: Record<string, FieldDef[]> = {
  purchase: [
    {
      key: "bought_from",
      label: "Acheté de",
      kind: "select",
      options: [
        { value: "particulier", label: "Particulier" },
        { value: "concessionnaire", label: "Concessionnaire" },
        { value: "encan", label: "Encan" },
        { value: "autre", label: "Autre" },
      ],
      optional: true,
    },
    {
      key: "purchase_price",
      label: "Prix d'achat",
      kind: "number",
      optional: true,
      visibilityKey: "purchase_price_public",
      visibilityLabel: "Rendre le prix visible publiquement",
      placeholder: "ex. 28500",
    },
    {
      key: "origin_province",
      label: "Province / État d'origine",
      kind: "text",
      optional: true,
      placeholder: "ex. Québec",
    },
  ],
  sale: [
    {
      key: "sold_to",
      label: "Vendu à",
      kind: "select",
      options: [
        { value: "particulier", label: "Particulier" },
        { value: "concessionnaire", label: "Concessionnaire" },
        { value: "encan", label: "Encan" },
        { value: "autre", label: "Autre" },
      ],
      optional: true,
    },
    {
      key: "sale_price",
      label: "Prix de vente",
      kind: "number",
      optional: true,
      visibilityKey: "sale_price_public",
      visibilityLabel: "Rendre le prix visible publiquement",
      placeholder: "ex. 22500",
    },
    {
      key: "sale_reason",
      label: "Raison de la vente",
      kind: "text",
      optional: true,
      placeholder: "ex. Achat d'un véhicule plus grand",
    },
  ],
  maintenance: [
    {
      key: "maintenance_type",
      label: "Type d'entretien",
      kind: "select",
      options: [
        { value: "vidange", label: "Vidange" },
        { value: "freins", label: "Freins" },
        { value: "pneus", label: "Pneus" },
        { value: "batterie", label: "Batterie" },
        { value: "filtre", label: "Filtre" },
        { value: "autre", label: "Autre" },
      ],
    },
    {
      key: "performed_by",
      label: "Effectué par",
      kind: "text",
      optional: true,
      placeholder: "ex. Garage Untel",
    },
  ],
  repair: [
    {
      key: "component_repaired",
      label: "Composant réparé",
      kind: "text",
      placeholder: "ex. Alternateur",
    },
    {
      key: "performed_by",
      label: "Effectué par",
      kind: "text",
      optional: true,
      placeholder: "ex. Garage Untel",
    },
    {
      key: "repair_cost",
      label: "Coût",
      kind: "number",
      optional: true,
      visibilityKey: "repair_cost_public",
      visibilityLabel: "Rendre le coût visible publiquement",
      placeholder: "ex. 850",
    },
  ],
  inspection: [
    {
      key: "inspection_type",
      label: "Type d'inspection",
      kind: "select",
      options: [
        { value: "ppi", label: "PPI" },
        { value: "mecanique", label: "Inspection mécanique" },
        { value: "controle_technique", label: "Contrôle technique" },
        { value: "autre", label: "Autre" },
      ],
    },
    {
      key: "inspection_result",
      label: "Résultat",
      kind: "select",
      options: [
        { value: "reussi", label: "Réussi" },
        { value: "echoue", label: "Échoué" },
        { value: "conditionnel", label: "Conditionnel" },
      ],
    },
    {
      key: "performed_by",
      label: "Effectué par",
      kind: "text",
      optional: true,
      placeholder: "ex. Centre d'inspection X",
    },
  ],
  accident: [
    {
      key: "severity",
      label: "Gravité",
      kind: "select",
      options: [
        { value: "mineur", label: "Mineur" },
        { value: "modere", label: "Modéré" },
        { value: "majeur", label: "Majeur" },
        { value: "perte_totale", label: "Perte totale" },
      ],
    },
    {
      key: "insurance_declared",
      label: "Déclaré à l'assurance",
      kind: "select",
      options: [
        { value: "oui", label: "Oui" },
        { value: "non", label: "Non" },
      ],
    },
  ],
  modification: [
    {
      key: "modification_type",
      label: "Type de modification",
      kind: "text",
      placeholder: "ex. Suspension rabaissée",
    },
  ],
  recall: [
    {
      key: "recall_number",
      label: "Numéro de rappel",
      kind: "text",
      optional: true,
      placeholder: "ex. 23V-001",
    },
    {
      key: "recall_status",
      label: "Statut",
      kind: "select",
      options: [
        { value: "effectue", label: "Effectué" },
        { value: "non_effectue", label: "Non effectué" },
        { value: "en_attente", label: "En attente" },
      ],
    },
  ],
  listing: [
    {
      key: "asking_price",
      label: "Prix demandé",
      kind: "number",
      optional: true,
      placeholder: "ex. 24900",
    },
    {
      key: "platform",
      label: "Plateforme",
      kind: "text",
      optional: true,
      placeholder: "ex. AutoHebdo, Kijiji…",
    },
  ],
};

export function getFieldsForEventType(eventType: string | null | undefined): FieldDef[] {
  if (!eventType) return [];
  return EVENT_TYPE_FIELDS[eventType] ?? [];
}

// Format a metadata object for display. Returns ordered { label, value } pairs.
export function formatMetadataForDisplay(
  eventType: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined
): { label: string; value: string }[] {
  if (!metadata || typeof metadata !== "object") return [];
  const fields = getFieldsForEventType(eventType);
  const out: { label: string; value: string }[] = [];
  for (const f of fields) {
    const raw = (metadata as Record<string, unknown>)[f.key];
    if (raw === undefined || raw === null || raw === "") continue;

    let value = "";
    if (f.kind === "select" && f.options) {
      value = f.options.find((o) => o.value === String(raw))?.label ?? String(raw);
    } else if (f.kind === "number") {
      const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
      if (!Number.isFinite(n)) continue;
      value = `${n.toLocaleString("fr-CA")} $`;
      // Hide private prices unless explicitly public
      if (f.visibilityKey) {
        const isPublic = (metadata as Record<string, unknown>)[f.visibilityKey] === true;
        if (!isPublic) value = `${value} (privé)`;
      }
    } else {
      value = String(raw);
    }

    out.push({ label: f.label, value });
  }
  return out;
}
