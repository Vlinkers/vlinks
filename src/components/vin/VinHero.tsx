import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight, CheckCircle, AlertTriangle, Shield, Users,
  HelpCircle, Info, MessageSquare, Car
} from "lucide-react";
import type { VinDossier, TrustQuadrant } from "@/hooks/useVinDossier";

interface VinHeroProps {
  dossier: VinDossier;
}

// ── Trust quadrant config ──
const QUADRANT_CONFIG: Record<TrustQuadrant, {
  label: string;
  color: string;
  bg: string;
  border: string;
  barColor: string;
  icon: typeof CheckCircle;
}> = {
  convergent: {
    label: "Dossier convergent",
    color: "text-[hsl(152,69%,38%)]",
    bg: "bg-[hsl(152,69%,38%,0.08)]",
    border: "border-[hsl(152,69%,38%,0.25)]",
    barColor: "bg-[hsl(152,69%,38%)]",
    icon: CheckCircle,
  },
  owner_monologue: {
    label: "Monologue propriétaire",
    color: "text-[hsl(38,92%,50%)]",
    bg: "bg-[hsl(38,92%,50%,0.08)]",
    border: "border-[hsl(38,92%,50%,0.25)]",
    barColor: "bg-[hsl(38,92%,50%)]",
    icon: AlertTriangle,
  },
  community_dossier: {
    label: "Dossier communautaire",
    color: "text-[hsl(224,78%,47%)]",
    bg: "bg-[hsl(224,78%,47%,0.08)]",
    border: "border-[hsl(224,78%,47%,0.25)]",
    barColor: "bg-[hsl(224,78%,47%)]",
    icon: Info,
  },
  to_build: {
    label: "Dossier à construire",
    color: "text-muted-foreground",
    bg: "bg-muted/40",
    border: "border-border",
    barColor: "bg-muted-foreground/40",
    icon: HelpCircle,
  },
};

// ── Red flag type labels ──
const RED_FLAG_LABELS: Record<string, string> = {
  odometer_rollback: "Recul d'odomètre",
  title_wash: "Titre blanchi",
  flood_damage: "Dommage par inondation",
  frame_damage: "Dommage au châssis",
  stolen: "Véhicule volé",
  lemon: "Citron",
  salvage_rebuilt: "Reconstruit après perte totale",
  inconsistent_history: "Historique incohérent",
  suspicious_listing: "Annonce suspecte",
  other: "Autre",
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-[hsl(0,72%,51%)] text-white",
  high: "bg-[hsl(0,72%,51%,0.15)] text-[hsl(0,72%,51%)]",
  medium: "bg-[hsl(38,92%,50%,0.15)] text-[hsl(38,92%,50%)]",
  low: "bg-muted text-muted-foreground",
};

// ── Summary builder ──
function buildSummary(dossier: VinDossier): string {
  const { vehicle, stats, trustQuadrant, redFlags } = dossier;
  const parts: string[] = [];

  const name = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  parts.push(
    `${name || "Véhicule"} avec ${stats.totalEvents} événement${stats.totalEvents !== 1 ? "s" : ""} documenté${stats.totalEvents !== 1 ? "s" : ""}.`
  );

  if (stats.activeRedFlags > 0) {
    const flagNames = redFlags.slice(0, 2).map((f) => RED_FLAG_LABELS[f.flag_type] || f.title).join(", ");
    parts.push(
      `${stats.activeRedFlags} alerte${stats.activeRedFlags > 1 ? "s" : ""} active${stats.activeRedFlags > 1 ? "s" : ""} (${flagNames}).`
    );
  }

  const quadrantDesc: Record<TrustQuadrant, string> = {
    convergent: "Dossier alimenté par la communauté et le propriétaire — les deux voix convergent.",
    owner_monologue: "Seul le propriétaire a contribué — la communauté n'a pas encore documenté ce véhicule.",
    community_dossier: "Dossier principalement communautaire — le propriétaire n'a pas contribué.",
    to_build: "Peu d'informations disponibles — ce dossier reste à construire.",
  };
  parts.push(quadrantDesc[trustQuadrant]);

  return parts.join(" ");
}

export function VinHero({ dossier }: VinHeroProps) {
  const { vin, vehicle, stats, trustQuadrant, redFlags } = dossier;
  const qConfig = QUADRANT_CONFIG[trustQuadrant];
  const QuadrantIcon = qConfig.icon;

  const vehicleName = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const vehicleSpecs = [
    { label: "Motorisation", value: vehicle.engine },
    { label: "Carrosserie", value: vehicle.body_class },
    { label: "Transmission", value: vehicle.drive_type },
    { label: "Carburant", value: vehicle.fuel_type },
    { label: "Finition", value: vehicle.trim },
  ].filter((s) => s.value);

  return (
    <div>
      {/* ═══ DARK HERO ═══ */}
      <div className="bg-[hsl(222,47%,11%)] w-full relative overflow-hidden">
        {vin.featured_photo_url && (
          <>
            <img
              src={vin.featured_photo_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)]" />
          </>
        )}

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-[hsl(215,16%,47%)] mb-5">
            <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[hsl(215,25%,65%)]">{vehicleName || vin.vin}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:gap-10">
            {/* ── Left: Photo + identity ── */}
            <div className="flex-1 space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[hsl(215,16%,47%)]">
                DOSSIER VÉHICULE
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white leading-tight">
                {vehicleName || "Véhicule inconnu"}
              </h1>
              <p className="font-mono text-[15px] text-[hsl(217,91%,68%)] tracking-[0.08em]">
                {vin.vin}
              </p>

              {/* Vehicle specs */}
              {vehicleSpecs.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {vehicleSpecs.map((spec) => (
                    <div key={spec.label} className="bg-[hsl(217,33%,17%)] rounded-md px-3 py-1.5">
                      <span className="block text-[11px] text-[hsl(215,16%,47%)]">{spec.label}</span>
                      <span className="block text-[13px] font-semibold text-white">{spec.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick stats row */}
              <div className="flex items-end gap-6 pt-4">
                {[
                  { value: stats.totalEvents, label: "Événements" },
                  { value: stats.totalFacts, label: "Faits" },
                  { value: stats.uniqueContributors, label: stats.uniqueContributors === 1 ? "Contributeur" : "Contributeurs", icon: Users },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <span className="block text-[28px] md:text-[32px] font-bold text-white leading-none font-display">
                      {s.value}
                    </span>
                    <span className="block text-[12px] text-[hsl(215,25%,65%)] mt-1 flex items-center justify-center gap-1">
                      {s.icon && <s.icon className="w-3 h-3" />}
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Trust matrix ── */}
            <div className="mt-6 lg:mt-0 lg:w-[280px] flex-shrink-0">
              <div className={`rounded-lg p-4 ${qConfig.bg} border ${qConfig.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <QuadrantIcon className={`w-4 h-4 ${qConfig.color}`} />
                  <span className={`text-sm font-semibold ${qConfig.color}`}>
                    {qConfig.label}
                  </span>
                </div>

                {/* Community score bar */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[hsl(215,25%,75%)]">Confiance communautaire</span>
                      <span className="font-mono font-semibold text-white">{stats.communityScore}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stats.communityScore >= 50
                            ? "bg-[hsl(224,78%,47%)]"
                            : "bg-[hsl(215,16%,47%,0.5)]"
                        }`}
                        style={{ width: `${stats.communityScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Owner transparency bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[hsl(215,25%,75%)]">Transparence propriétaire</span>
                      <span className="font-mono font-semibold text-white">{stats.ownerTransparency}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stats.ownerTransparency >= 50
                            ? "bg-[hsl(152,69%,38%)]"
                            : "bg-[hsl(215,16%,47%,0.5)]"
                        }`}
                        style={{ width: `${stats.ownerTransparency}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Proof tier breakdown */}
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block text-[16px] font-bold text-white font-display">{stats.verifiedFacts}</span>
                    <span className="block text-[10px] text-[hsl(215,25%,65%)]">Vérifiés</span>
                  </div>
                  <div>
                    <span className="block text-[16px] font-bold text-white font-display">{stats.documentedFacts}</span>
                    <span className="block text-[10px] text-[hsl(215,25%,65%)]">Documentés</span>
                  </div>
                  <div>
                    <span className="block text-[16px] font-bold text-white font-display">{stats.declarationFacts}</span>
                    <span className="block text-[10px] text-[hsl(215,25%,65%)]">Déclarés</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RED FLAGS BANNER ═══ */}
      {redFlags.length > 0 && (
        <div className="bg-[hsl(0,72%,51%,0.06)] border-b border-[hsl(0,72%,51%,0.15)]">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[hsl(0,72%,51%)]" />
              <span className="text-sm font-semibold text-[hsl(0,72%,51%)]">
                {redFlags.length} alerte{redFlags.length > 1 ? "s" : ""} active{redFlags.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {redFlags.map((flag) => (
                <button
                  key={flag.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[hsl(0,72%,51%,0.2)] bg-white hover:bg-[hsl(0,72%,51%,0.05)] transition-colors text-xs"
                >
                  <AlertTriangle className="w-3 h-3 text-[hsl(0,72%,51%)]" />
                  <span className="font-medium text-foreground">
                    {RED_FLAG_LABELS[flag.flag_type] || flag.title}
                  </span>
                  <Badge className={`text-[10px] px-1.5 py-0 h-4 ${SEVERITY_STYLES[flag.severity] || SEVERITY_STYLES.medium}`}>
                    {flag.severity}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ RÉSUMÉ EXPRESS ═══ */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {buildSummary(dossier)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
