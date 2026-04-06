import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ContributionType } from "@/hooks/useVINData";

interface CompletenessScoreProps {
  contributions: { type: ContributionType; hasPhotos: boolean; hasDocuments: boolean }[];
  onAddType: (type: ContributionType) => void;
}

interface ScoreCriterion {
  key: string;
  label: string;
  chipLabel: string;
  points: number;
  met: boolean;
  type: ContributionType;
}

export function CompletenessScore({ contributions, onAddType }: CompletenessScoreProps) {
  const hasPhotoEvidence = contributions.some(c => c.type === "photo_evidence" || (c.hasPhotos && c.type !== "photo_evidence"));
  const hasInspection = contributions.some(c => c.type === "inspection_report" || c.type === "mechanic_conversation");
  const hasHistory = contributions.some(c => c.type === "vehicle_history");
  const hasPhotos = contributions.some(c => c.hasPhotos || c.type === "photo_evidence");
  const hasSellerExchange = contributions.some(c => c.type === "owner_exchange" || c.type === "purchase_decision");

  const criteria: ScoreCriterion[] = [
    { key: "visit", label: "Visite physique", chipLabel: "Ajouter une visite physique", points: 20, met: hasPhotoEvidence, type: "photo_evidence" },
    { key: "ppi", label: "Rapport d'inspection", chipLabel: "Ajouter un rapport PPI", points: 25, met: hasInspection, type: "inspection_report" },
    { key: "history", label: "Historique d'entretien", chipLabel: "Ajouter un historique", points: 20, met: hasHistory, type: "vehicle_history" },
    { key: "photos", label: "Photos du véhicule", chipLabel: "Ajouter des photos", points: 20, met: hasPhotos, type: "photo_evidence" },
    { key: "exchange", label: "Échange vendeur", chipLabel: "Ajouter un échange", points: 15, met: hasSellerExchange, type: "owner_exchange" },
  ];

  const score = criteria.reduce((acc, c) => acc + (c.met ? c.points : 0), 0);
  const missing = criteria.filter(c => !c.met);

  return (
    <div className="mb-5 p-4 rounded-xl bg-card border border-border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">Complétude du dossier</span>
        <span className="text-sm font-bold text-primary">{score}%</span>
      </div>
      <Progress value={score} className="h-2 mb-3" />
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {missing.map(m => (
            <button
              key={m.key}
              onClick={() => onAddType(m.type)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer border border-border"
            >
              ＋ {m.chipLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
