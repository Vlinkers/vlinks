import { useMemo, useState } from "react";
import { KeyRound, ShieldCheck, Shield, User, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProofTierBadge } from "@/components/vin/ProofTierBadge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import type { EventWithFacts, Contributor } from "@/hooks/useVinDossier";
import type { Tables } from "@/integrations/supabase/types";

// ── Props ───────────────────────────────────────────────

type OwnerVerification = Tables<"owner_verifications">;

interface FaceBPanelProps {
  events: EventWithFacts[];
  ownerContributor: Contributor | null;
  ownerVerification: OwnerVerification | null;
  onFactClick: (factId: string) => void;
  vinId: string;
}

// ── Config ──────────────────────────────────────────────

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  certificate_only:     { label: "Propriétaire déclaré",  color: "hsl(32, 95%, 52%)" },
  certificate_plus_vin: { label: "Propriétaire confirmé", color: "hsl(224, 78%, 47%)" },
  chain_of_trust:       { label: "Propriétaire certifié", color: "hsl(152, 69%, 38%)" },
};

const ROLE_LABELS: Record<string, string> = {
  owner_verified: "Propriétaire vérifié",
  owner_unverified: "Propriétaire",
  former_owner: "Ancien propriétaire",
  dealer: "Concessionnaire",
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", { year: "numeric", month: "long" });
}

// ── Main component ──────────────────────────────────────

export function FaceBPanel({
  events,
  ownerContributor,
  ownerVerification,
  onFactClick,
  vinId,
}: FaceBPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filter to face_b facts
  const faceBEvents = useMemo(() => {
    return events
      .map((ewf) => ({
        ...ewf,
        facts: ewf.facts.filter((f) => f.fact.face === "face_b"),
      }))
      .filter((ewf) => ewf.facts.length > 0);
  }, [events]);

  const totalFacts = useMemo(() => {
    return faceBEvents.reduce((sum, e) => sum + e.facts.length, 0);
  }, [faceBEvents]);

  const hasOwner = ownerContributor != null;
  const isCurrentUserOwner = user && ownerContributor?.user_id === user.id;

  // Verification tier display
  const verTier = ownerVerification?.verification_tier;
  const tierInfo = verTier ? TIER_LABELS[verTier] : null;

  // Content to render
  const content = (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">Espace propriétaire</h3>
        </div>
      </div>

      {!hasOwner ? (
        /* Empty state */
        <Card className="p-5 border-dashed bg-muted/20">
          <div className="text-center space-y-2">
            <Shield size={24} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Le propriétaire n'a pas encore contribué à ce dossier.
            </p>
            <p className="text-[11px] text-muted-foreground/70 italic">
              L'absence de contribution du propriétaire est une information en soi.
            </p>
            {user && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => navigate(`/vin/${vinId}#contribuer`)}
              >
                Réclamer ce véhicule
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Owner identity card */}
          <Card className="p-3 space-y-2 bg-muted/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User size={14} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {ownerContributor.display_name ?? ROLE_LABELS[ownerContributor.role] ?? "Propriétaire"}
                </p>
                {tierInfo ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 gap-1 border"
                    style={{ color: tierInfo.color, borderColor: `${tierInfo.color}33` }}
                  >
                    <ShieldCheck size={10} />
                    {tierInfo.label}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                    Non vérifié
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
              <p>
                Propriétaire depuis : {formatDate(ownerContributor.created_at)}
              </p>
              <p>
                {ownerContributor.facts_count ?? 0} fait{(ownerContributor.facts_count ?? 0) !== 1 ? "s" : ""} déposé{(ownerContributor.facts_count ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </Card>

          {/* Owner facts by event */}
          {faceBEvents.length > 0 ? (
            <div className="space-y-2">
              {faceBEvents.map((ewf) => (
                <div key={ewf.event.id} className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {ewf.event.title}
                  </p>
                  {ewf.facts.map((fw) => (
                    <button
                      key={fw.fact.id}
                      onClick={() => onFactClick(fw.fact.id)}
                      className="w-full text-left px-2.5 py-2 rounded-md border border-border/50 hover:bg-accent/30 transition-colors space-y-1"
                    >
                      <p className="text-xs leading-snug line-clamp-3">{fw.fact.content}</p>
                      <div className="flex items-center gap-2">
                        {fw.fact.proof_tier && (
                          <ProofTierBadge tier={fw.fact.proof_tier} size="xs" showLabel={false} />
                        )}
                        {fw.evidence.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {fw.evidence.length} preuve{fw.evidence.length > 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(fw.fact.created_at)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Aucun fait déposé par le propriétaire.
            </p>
          )}

          {/* Droit de réponse */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare size={12} className="text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Droit de réponse
              </p>
            </div>
            {isCurrentUserOwner ? (
              <p className="text-xs text-muted-foreground">
                Vous pouvez répondre aux faits communautaires depuis la section{" "}
                <a href="#contribuer" className="text-primary hover:underline">Contribuer</a>.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Le propriétaire peut répondre aux faits communautaires.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:block">{content}</div>

      {/* Mobile: collapsible */}
      <div className="md:hidden">
        <Collapsible open={mobileOpen} onOpenChange={setMobileOpen}>
          <CollapsibleTrigger className="w-full">
            <Card className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium">Espace propriétaire</span>
                <span className="text-xs text-muted-foreground">· {totalFacts} fait{totalFacts !== 1 ? "s" : ""}</span>
              </div>
              <svg
                className={`w-4 h-4 text-muted-foreground transition-transform ${mobileOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
            <div className="pt-3">{content}</div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}
