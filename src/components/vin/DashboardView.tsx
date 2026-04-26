import { useMemo } from "react";
import { MessageSquare, Camera, FileText, Wrench, Users, Plus, Clock, KeyRound, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDocumentEvidence, isVehiclePhotoEvidence } from "@/lib/mediaClassification";
import type { VinDossier } from "@/hooks/useVinDossier";

export type DashboardTarget = "contributions" | "photos" | "documents" | "contribute";

interface DashboardViewProps {
  dossier: VinDossier | undefined;
  onNavigate: (view: DashboardTarget) => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  purchase: "Achat",
  sale: "Vente",
  maintenance: "Entretien",
  inspection: "Inspection",
  accident: "Accident",
  repair: "Réparation",
  modification: "Modification",
  recall: "Rappel",
  insurance_claim: "Réclamation d'assurance",
  listing: "Mise en vente",
  import_export: "Import/Export",
  registration: "Immatriculation",
  mileage_record: "Relevé kilométrique",
  observation: "Observation",
  other: "Autre",
};

function translateEventType(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function DashboardView({ dossier, onNavigate }: DashboardViewProps) {
  const inventory = useMemo(() => {
    if (!dossier) {
      return { contributions: 0, photos: 0, documents: 0, inspections: 0, contributors: 0 };
    }
    let photos = 0;
    let documents = 0;
    let inspections = 0;
    for (const ewf of dossier.events) {
      if (ewf.event.event_type === "inspection") inspections++;
      for (const fw of ewf.facts) {
        for (const ev of fw.evidence) {
          if (isVehiclePhotoEvidence(ev)) photos++;
          else if (isDocumentEvidence(ev)) documents++;
        }
      }
    }
    return {
      contributions: dossier.stats.totalEvents,
      photos,
      documents,
      inspections,
      contributors: dossier.stats.uniqueContributors,
    };
  }, [dossier]);

  const tiles: { key: DashboardTarget; icon: typeof MessageSquare; emoji: string; value: number; label: string; sublabel?: string }[] = [
    {
      key: "contributions",
      icon: MessageSquare,
      emoji: "💬",
      value: inventory.contributions,
      label: inventory.contributions === 1 ? "contribution" : "contributions",
      sublabel: `${inventory.contributors} ${inventory.contributors === 1 ? "contributeur" : "contributeurs"}`,
    },
    { key: "photos",        icon: Camera,    emoji: "📷", value: inventory.photos,      label: inventory.photos === 1 ? "photo" : "photos" },
    { key: "documents",     icon: FileText,  emoji: "📄", value: inventory.documents,   label: inventory.documents === 1 ? "document" : "documents" },
    { key: "contributions", icon: Wrench,    emoji: "🔧", value: inventory.inspections, label: inventory.inspections === 1 ? "rapport d'inspection" : "rapports d'inspection" },
  ];

  // ── Section 2: missing items ────────────────────────────────────────────
  const gaps = useMemo(() => {
    if (!dossier) return [];
    const list: string[] = [];
    const hasInspection = dossier.events.some(e => e.event.event_type === "inspection");
    if (!hasInspection) list.push("Aucun rapport d'inspection");
    const hasOwner = dossier.contributors.some(c => c.role === "owner_verified" || c.role === "owner_unverified");
    if (!hasOwner) list.push("Le propriétaire n'a pas contribué à ce dossier");
    if (inventory.photos === 0) list.push("Aucune photo disponible");
    if (dossier.events.length < 2) list.push("Peu d'informations disponibles sur ce véhicule");
    return list;
  }, [dossier, inventory.photos]);

  // ── Section 3: latest 3 contributions (events) ──────────────────────────
  const recent = useMemo(() => {
    if (!dossier) return [];
    return [...dossier.events]
      .sort((a, b) => {
        const da = a.event.event_date ? new Date(a.event.event_date).getTime() : 0;
        const db = b.event.event_date ? new Date(b.event.event_date).getTime() : 0;
        return db - da;
      })
      .slice(0, 3)
      .map(ewf => {
        const firstFact = ewf.facts[0];
        const contributor = firstFact?.contributor;
        const title = (ewf.event.title ?? "").trim();
        const body = (firstFact?.fact.content ?? "").trim();
        // Aggressive normalization: lowercase, strip punctuation/diacritics/whitespace.
        const normalize = (s: string) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // diacritics
            .replace(/[…\.\,\!\?\;\:\'\"\`\(\)\[\]]/g, "")
            .replace(/\s+/g, " ")
            .trim();
        const titleNorm = normalize(title);
        const bodyNorm = normalize(body);
        const titleEqualsBody = !!titleNorm && titleNorm === bodyNorm;
        const titleIsTruncatedPrefix =
          !!titleNorm && !!bodyNorm && bodyNorm.startsWith(titleNorm) && body.length > title.length;
        // Also dedupe if title shares the first 20 chars with body
        const sharedPrefix =
          !!titleNorm && !!bodyNorm && titleNorm.slice(0, 20) === bodyNorm.slice(0, 20);
        const useBodyAsTitle = !title || titleEqualsBody || titleIsTruncatedPrefix || sharedPrefix;
        const displayTitle = useBodyAsTitle ? body : title;
        const displayExcerpt = useBodyAsTitle ? null : (body || null);
        return {
          id: ewf.event.id,
          title: displayTitle,
          type: ewf.event.event_type,
          date: ewf.event.event_date,
          excerpt: displayExcerpt,
          author: contributor?.is_anonymous ? "Anonyme" : (contributor?.display_name ?? "Anonyme"),
        };
      });
  }, [dossier]);

  return (
    <div className="animate-in fade-in duration-200 space-y-8">
      <header>
        <h2 className="font-display text-2xl font-bold text-foreground">Tableau de bord</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aperçu de ce qui est disponible dans ce dossier.
        </p>
      </header>

      {/* ─── Section 1: Inventaire ──────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
          Inventaire du dossier
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiles.map((tile, idx) => {
            const Icon = tile.icon;
            return (
              <button
                key={`${tile.label}-${idx}`}
                onClick={() => onNavigate(tile.key)}
                className={cn(
                  "group rounded-xl border border-border bg-card p-4 text-left",
                  "transition-all hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-foreground/70" />
                  </div>
                  <span className="text-base opacity-60">{tile.emoji}</span>
                </div>
                <div className="font-display text-2xl font-bold text-foreground leading-none">
                  {tile.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 leading-tight">
                  {tile.label}
                </div>
                {tile.sublabel && (
                  <div className="text-[11px] text-muted-foreground/70 mt-0.5 leading-tight inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {tile.sublabel}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Section 2: Informations non disponibles ────────────────── */}
      {gaps.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
            Informations non disponibles
          </h3>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {gaps.map((g) => (
              <div key={g} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground/80">{g}</span>
                <button
                  onClick={() => onNavigate("contribute")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Section 3: Dernière activité ───────────────────────────── */}
      {recent.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
            Dernière activité
          </h3>
          <div className="space-y-2">
            {recent.map((r) => {
              const isPurchase = r.type === "purchase";
              const isSale = r.type === "sale";
              const isTransaction = isPurchase || isSale;
              return (
                <button
                  key={r.id}
                  onClick={() => onNavigate("contributions")}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 hover:shadow-sm transition-all",
                    isTransaction
                      ? "border-l-[5px] border-l-[hsl(35,85%,50%)] border-y-border border-r-border bg-[hsl(40,60%,98%)] hover:border-[hsl(35,85%,50%)]/60"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  {isTransaction && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {isPurchase ? (
                        <KeyRound className="w-3 h-3 text-[hsl(35,85%,30%)]" />
                      ) : (
                        <ArrowLeftRight className="w-3 h-3 text-[hsl(35,85%,30%)]" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(35,85%,30%)]">
                        {isPurchase ? "Achat" : "Vente"} — Changement de propriétaire
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" />
                    <span>{r.date ?? "Date inconnue"}</span>
                    {r.type !== "other" && !isTransaction && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-foreground/70">{translateEventType(r.type)}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{r.author}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground line-clamp-2">{r.title}</div>
                  {r.excerpt && r.excerpt.trim().toLowerCase() !== r.title.trim().toLowerCase() && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.excerpt}</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
