import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight, CheckCircle, AlertTriangle, Shield, Users,
  HelpCircle, Info, MessageSquare, Copy
} from "lucide-react";
import { toast } from "sonner";
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
  icon: typeof CheckCircle;
}> = {
  convergent: {
    label: "Dossier convergent",
    color: "text-[hsl(var(--success))]",
    bg: "bg-[hsl(var(--success)/0.08)]",
    border: "border-[hsl(var(--success)/0.25)]",
    icon: CheckCircle,
  },
  owner_monologue: {
    label: "Monologue propriétaire",
    color: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning)/0.08)]",
    border: "border-[hsl(var(--warning)/0.25)]",
    icon: AlertTriangle,
  },
  community_dossier: {
    label: "Dossier communautaire",
    color: "text-[hsl(var(--primary))]",
    bg: "bg-[hsl(var(--primary)/0.08)]",
    border: "border-[hsl(var(--primary)/0.25)]",
    icon: Info,
  },
  to_build: {
    label: "Dossier à construire",
    color: "text-[hsl(215,25%,65%)]",
    bg: "bg-[hsl(215,16%,47%,0.1)]",
    border: "border-[hsl(215,16%,47%,0.2)]",
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
  critical: "bg-[hsl(var(--danger))] text-white",
  high: "bg-[hsl(var(--danger)/0.15)] text-[hsl(var(--danger))]",
  medium: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
  low: "bg-muted text-muted-foreground",
};

// ── Summary builder ──
function buildSummary(dossier: VinDossier): string {
  const { vehicle, stats, trustQuadrant, redFlags } = dossier;
  const parts: string[] = [];

  const name = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
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

function copyVin(vin: string) {
  navigator.clipboard.writeText(vin);
  toast.success("VIN copié");
}

export function VinHero({ dossier }: VinHeroProps) {
  const { vin, vehicle, stats, trustQuadrant, redFlags } = dossier;
  const qConfig = QUADRANT_CONFIG[trustQuadrant];
  const QuadrantIcon = qConfig.icon;

  const vehicleName = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
  const vehicleSpecs = [
    { label: "Motorisation", value: vehicle.engine },
    { label: "Carrosserie", value: vehicle.body_class },
    { label: "Transmission", value: vehicle.drive_type },
    { label: "Carburant", value: vehicle.fuel_type },
  ].filter((s) => s.value);

  return (
    <div>
      {/* ═══ DARK HERO — gradient background, no photo ═══ */}
      <div className="w-full bg-gradient-to-br from-[#0F2419] via-[#142e20] to-[#1B4D3E]">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-[hsl(215,25%,55%)] mb-6">
            <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[hsl(152,69%,60%)]">{vehicleName || vin.vin}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:gap-10">
            {/* ── LEFT: Vehicle Identity (~60%) ── */}
            <div className="flex-1 space-y-4">
              <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[hsl(152,69%,50%)]">
                DOSSIER VÉHICULE
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white leading-tight">
                {vehicleName || "Véhicule inconnu"}
              </h1>

              {/* VIN cliquable */}
              <button
                onClick={() => copyVin(vin.vin)}
                className="inline-flex items-center gap-2 font-mono text-[15px] text-[hsl(152,69%,60%)] tracking-[0.08em] hover:text-white transition-colors group"
                title="Copier le VIN"
              >
                {vin.vin}
                <Copy className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Vehicle specs chips */}
              {vehicleSpecs.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {vehicleSpecs.map((spec) => (
                    <div
                      key={spec.label}
                      className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-md px-3 py-1.5"
                    >
                      <span className="block text-[10px] uppercase tracking-wider text-[hsl(215,25%,55%)]">
                        {spec.label}
                      </span>
                      <span className="block text-[13px] font-semibold text-white">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick stats — large numbers */}
              <div className="flex items-end gap-8 pt-4">
                {[
                  { value: stats.totalEvents, label: "Événements" },
                  { value: stats.totalFacts, label: "Faits" },
                  { value: stats.uniqueContributors, label: stats.uniqueContributors === 1 ? "Contributeur" : "Contributeurs", icon: Users },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <span className="block text-[32px] md:text-[36px] font-bold text-white leading-none font-display">
                      {s.value}
                    </span>
                    <span className="block text-[11px] text-[hsl(215,25%,60%)] mt-1 flex items-center justify-center gap-1">
                      {s.icon && <s.icon className="w-3 h-3" />}
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Trust Matrix (~40%) ── */}
            <div className="mt-8 lg:mt-0 lg:w-[300px] flex-shrink-0">
              <div className="rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.1] p-5">
                {/* Quadrant label */}
                <div className="flex items-center gap-2 mb-4">
                  <QuadrantIcon className={`w-5 h-5 ${qConfig.color}`} />
                  <span className={`text-sm font-bold ${qConfig.color}`}>
                    {qConfig.label}
                  </span>
                </div>

                {/* Community score bar */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-[hsl(215,25%,70%)]">Confiance communautaire</span>
                      <span className="font-mono font-bold text-white text-sm">{stats.communityScore}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${stats.communityScore}%`,
                          backgroundColor: stats.communityScore >= 50
                            ? "hsl(var(--primary))"
                            : "hsl(215,16%,47%,0.5)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Owner transparency bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-[hsl(215,25%,70%)]">Transparence propriétaire</span>
                      <span className="font-mono font-bold text-white text-sm">{stats.ownerTransparency}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${stats.ownerTransparency}%`,
                          backgroundColor: stats.ownerTransparency >= 50
                            ? "hsl(var(--success))"
                            : "hsl(215,16%,47%,0.5)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Proof tier breakdown */}
                <div className="mt-4 pt-4 border-t border-white/[0.08] grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block text-[18px] font-bold text-white font-display">{stats.verifiedFacts}</span>
                    <span className="block text-[10px] text-[hsl(var(--success))]">Vérifiés</span>
                  </div>
                  <div>
                    <span className="block text-[18px] font-bold text-white font-display">{stats.documentedFacts}</span>
                    <span className="block text-[10px] text-[hsl(var(--primary))]">Documentés</span>
                  </div>
                  <div>
                    <span className="block text-[18px] font-bold text-white font-display">{stats.declarationFacts}</span>
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
        <div className="bg-[hsl(var(--danger)/0.05)] border-b border-[hsl(var(--danger)/0.15)]">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[hsl(var(--danger))]" />
              <span className="text-sm font-semibold text-[hsl(var(--danger))]">
                {redFlags.length} alerte{redFlags.length > 1 ? "s" : ""} active{redFlags.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {redFlags.map((flag) => (
                <button
                  key={flag.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[hsl(var(--danger)/0.2)] bg-card hover:bg-[hsl(var(--danger)/0.05)] transition-colors text-xs"
                >
                  <AlertTriangle className="w-3 h-3 text-[hsl(var(--danger))]" />
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
