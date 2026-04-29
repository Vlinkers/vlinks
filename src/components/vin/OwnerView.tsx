import { useMemo, useState } from "react";
import { Shield, ShieldCheck, Home, Lock, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { ContributionDetailPanel, type ProfileMeta } from "@/components/vin/ContributionDetailPanel";
import { AdminContributionEditDialog } from "@/components/vin/AdminContributionEditDialog";
import { VinContributionCard } from "@/components/vin/VinContributionCard";
import type { EventWithFacts, VinDossier } from "@/hooks/useVinDossier";

const OWNER_ROLES = new Set(["owner_verified", "owner_unverified", "former_owner"]);


interface OwnerViewProps {
  dossier: VinDossier | null | undefined;
  vinId: string;
  vin: string;
}

export function OwnerView({ dossier, vinId, vin }: OwnerViewProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [claimOpen, setClaimOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEwf, setEditingEwf] = useState<EventWithFacts | null>(null);

  const events = dossier?.events ?? [];
  const contributors = dossier?.contributors ?? [];

  // Check if current user has a pending verification for this VIN
  const { data: myPendingVerification } = useQuery({
    queryKey: ["my-owner-verification", vinId, user?.id],
    enabled: !!user?.id && !!vinId,
    queryFn: async () => {
      const { data } = await supabase
        .from("owner_verifications")
        .select("id, verification_status, created_at")
        .eq("vin_id", vinId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Owner-related events: at least one fact whose contributor is an owner role
  const ownerEvents = useMemo<EventWithFacts[]>(() => {
    const filtered = events.filter((ewf) =>
      ewf.facts.some((f) => f.contributor && OWNER_ROLES.has(f.contributor.role))
    );
    return [...filtered].sort((a, b) => {
      const da = a.event.event_date ? new Date(a.event.event_date).getTime() : 0;
      const db = b.event.event_date ? new Date(b.event.event_date).getTime() : 0;
      return db - da;
    });
  }, [events]);

  const hasVerifiedOwner = contributors.some((c) => c.role === "owner_verified");
  const hasAnyOwner = contributors.some((c) => OWNER_ROLES.has(c.role));
  const hasPendingClaim = myPendingVerification?.verification_status === "pending";

  const selectedEwf = useMemo(
    () => events.find((e) => e.event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const panelOpen = !!selectedEventId && !!selectedEwf;

  return (
    <div className="animate-in fade-in duration-200">
      {/* Tinted backdrop wrapper for the section */}
      <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 px-4 md:px-6 pt-4 md:pt-6 pb-4 bg-[hsl(170,55%,96%)] border-b border-[hsl(170,40%,85%)]">
        <header className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(170,55%,90%)] flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[hsl(170,70%,30%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-display text-2xl font-bold text-foreground">Dossier propriétaire</h2>
              {hasVerifiedOwner ? (
                <Badge className="bg-[hsl(170,70%,35%)] text-white hover:bg-[hsl(170,70%,30%)]">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Propriétaire vérifié
                </Badge>
              ) : hasAnyOwner ? (
                <Badge variant="secondary" className="bg-[hsl(170,40%,90%)] text-[hsl(170,70%,25%)]">
                  Propriétaire déclaré
                </Badge>
              ) : hasPendingClaim ? (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  <Clock className="w-3 h-3 mr-1" />
                  Revendication en cours de vérification
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Non revendiqué
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Espace officiel — contributions du propriétaire actuel ou passé.
            </p>
          </div>
        </header>
      </div>

      {/* No owner yet — invitation OR pending state */}
      {!hasAnyOwner ? (
        hasPendingClaim ? (
          <Card className="p-8 text-center border-dashed border-amber-300 bg-amber-50/50">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-amber-700" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              Votre revendication est en cours de vérification
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Notre équipe examine actuellement le document que vous avez fourni. Vous serez notifié
              dès que votre statut de propriétaire sera confirmé.
            </p>
          </Card>
        ) : (
          <Card className="p-8 text-center border-dashed border-[hsl(170,40%,70%)] bg-[hsl(170,55%,98%)]">
            <div className="w-14 h-14 rounded-full bg-[hsl(170,55%,90%)] flex items-center justify-center mx-auto mb-4">
              <Home className="w-7 h-7 text-[hsl(170,70%,30%)]" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              Ce véhicule n'a pas encore de propriétaire déclaré sur VLINKS
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
              Si vous êtes le propriétaire actuel, vous pouvez revendiquer ce dossier pour ajouter
              l'historique d'entretien officiel et répondre aux observations de la communauté.
            </p>
            <Button
              onClick={() => setClaimOpen(true)}
              className="bg-[hsl(170,70%,30%)] hover:bg-[hsl(170,70%,25%)] text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Je suis le propriétaire actuel — Revendiquer ce VIN
            </Button>
            <p className="text-xs text-muted-foreground/70 mt-4 inline-flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Vérification documentaire requise (carte grise, plaque VIN…)
            </p>
          </Card>
        )
      ) : ownerEvents.length === 0 ? (
        <Card className="p-8 text-center border-dashed bg-[hsl(170,55%,98%)]">
          <p className="text-sm text-muted-foreground">
            Aucune contribution du propriétaire n'a encore été déposée.
          </p>
        </Card>
      ) : (
        <div
          className={cn(
            "transition-all duration-300 ease-out",
            panelOpen && !isMobile ? "lg:max-w-[55%] lg:pr-4" : "max-w-full"
          )}
        >
          <div className="space-y-3">
            {ownerEvents.map((ewf) => (
              <VinContributionCard
                key={ewf.event.id}
                ewf={ewf}
                isActive={ewf.event.id === selectedEventId}
                onClick={() => setSelectedEventId(ewf.event.id)}
                isAdmin={isAdmin}
                onEdit={() => setEditingEwf(ewf)}
                preferOwnerFact
              />
            ))}
          </div>
        </div>
      )}

      <ContributionDetailPanel
        ewf={selectedEwf}
        open={panelOpen}
        onClose={() => setSelectedEventId(null)}
        profiles={{} as Record<string, ProfileMeta>}
        isAdmin={isAdmin}
        onAdminEdit={() => selectedEwf && setEditingEwf(selectedEwf)}
      />

      <AdminContributionEditDialog
        ewf={editingEwf}
        open={!!editingEwf}
        onOpenChange={(o) => { if (!o) setEditingEwf(null); }}
        vinId={vinId}
      />

      <OwnerClaimForm
        vinId={vinId}
        vin={vin}
        open={claimOpen}
        onOpenChange={setClaimOpen}
        onSuccess={() => setClaimOpen(false)}
      />
    </div>
  );
}

