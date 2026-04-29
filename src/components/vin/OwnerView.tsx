import { useMemo, useState } from "react";
import { Shield, ShieldCheck, Home, Lock, Clock, Wrench, Plus, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useContributor } from "@/hooks/useContributor";
import { supabase } from "@/integrations/supabase/client";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { ContributionDetailPanel, type ProfileMeta } from "@/components/vin/ContributionDetailPanel";
import { AdminContributionEditDialog } from "@/components/vin/AdminContributionEditDialog";
import { VinContributionCard } from "@/components/vin/VinContributionCard";
import { VehicleHealthDashboard } from "@/components/vin/VehicleHealthDashboard";
import { MaintenanceLogForm } from "@/components/contribution/MaintenanceLogForm";
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
  const { contributor: myContributor, isVerifiedOwner: meIsVerifiedOwner } = useContributor(vinId);
  const queryClient = useQueryClient();

  const [claimOpen, setClaimOpen] = useState(false);
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEwf, setEditingEwf] = useState<EventWithFacts | null>(null);

  const events = dossier?.events ?? [];
  const contributors = dossier?.contributors ?? [];

  // Pending verification status for current user
  const { data: myPendingVerification } = useQuery({
    queryKey: ["my-owner-verification", vinId, user?.id],
    enabled: !!user?.id && !!vinId,
    queryFn: async () => {
      const { data } = await supabase
        .from("owner_verifications")
        .select("id, verification_status, created_at, verified_at")
        .eq("vin_id", vinId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Verified owner — fetch display name + verification date for header
  const verifiedOwnerInfo = useMemo(() => {
    const v = contributors.find((c) => c.role === "owner_verified");
    if (!v) return null;
    return {
      name: v.is_anonymous ? "Propriétaire vérifié" : (v.display_name ?? "Propriétaire vérifié"),
      since: v.created_at,
    };
  }, [contributors]);

  // All contributions whose primary fact is from an owner role
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

  // Find this owner's purchase event date — used to split before/after
  const purchaseDate = useMemo(() => {
    // Take the most recent verified owner; find their purchase event
    const verifiedOwnerContributorIds = contributors
      .filter((c) => OWNER_ROLES.has(c.role))
      .map((c) => c.id);
    const purchaseEvents = events.filter(
      (e) =>
        e.event.event_type === "purchase" &&
        e.facts.some((f) => verifiedOwnerContributorIds.includes(f.fact.contributor_id))
    );
    if (purchaseEvents.length === 0) return null;
    const dates = purchaseEvents
      .map((e) => e.event.event_date)
      .filter(Boolean)
      .map((d) => new Date(d as string).getTime());
    if (dates.length === 0) return null;
    return new Date(Math.min(...dates));
  }, [events, contributors]);

  const { afterPurchase, beforePurchase } = useMemo(() => {
    if (!purchaseDate) return { afterPurchase: ownerEvents, beforePurchase: [] as EventWithFacts[] };
    const cutoff = purchaseDate.getTime();
    const after: EventWithFacts[] = [];
    const before: EventWithFacts[] = [];
    for (const ewf of ownerEvents) {
      const d = ewf.event.event_date ? new Date(ewf.event.event_date).getTime() : null;
      if (d != null && d < cutoff) before.push(ewf);
      else after.push(ewf);
    }
    return { afterPurchase: after, beforePurchase: before };
  }, [ownerEvents, purchaseDate]);

  const hasVerifiedOwner = !!verifiedOwnerInfo;
  const hasAnyOwner = contributors.some((c) => OWNER_ROLES.has(c.role));
  const hasPendingClaim = myPendingVerification?.verification_status === "pending";

  const canAddLogEntry = (meIsVerifiedOwner || isAdmin) && hasVerifiedOwner;

  const selectedEwf = useMemo(
    () => events.find((e) => e.event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const panelOpen = !!selectedEventId && !!selectedEwf;

  const verificationDate = useMemo(() => {
    if (!verifiedOwnerInfo?.since) return null;
    try {
      return new Date(verifiedOwnerInfo.since).toLocaleDateString("fr-CA", {
        month: "long", year: "numeric",
      });
    } catch { return null; }
  }, [verifiedOwnerInfo]);

  const handleLogComplete = () => {
    setLogFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ["vin-dossier", vinId] });
  };

  return (
    <div className="animate-in fade-in duration-200">
      {/* Header */}
      <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 px-4 md:px-6 pt-4 md:pt-6 pb-4 bg-[hsl(170,55%,96%)] border-b border-[hsl(170,40%,85%)]">
        <header className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(170,55%,90%)] flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-[hsl(170,70%,30%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-display text-2xl font-bold text-foreground">
                🔧 Carnet d'entretien numérique
              </h2>
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
              {hasVerifiedOwner ? (
                <>
                  Historique d'entretien et suivi par système — {verifiedOwnerInfo!.name}
                  {verificationDate && (
                    <> · Propriétaire vérifié depuis {verificationDate}</>
                  )}
                </>
              ) : (
                "Espace officiel — réservé au propriétaire vérifié pour documenter l'entretien du véhicule."
              )}
            </p>
          </div>
        </header>
      </div>

      {/* No owner / pending states */}
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
              Si vous êtes le propriétaire actuel, vous pouvez revendiquer ce dossier pour ouvrir
              le carnet d'entretien et répondre aux observations de la communauté.
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
            Aucune entrée n'a encore été ajoutée au carnet d'entretien.
          </p>
        </Card>
      ) : (
        <div
          className={cn(
            "transition-all duration-300 ease-out",
            panelOpen && !isMobile ? "lg:max-w-[55%] lg:pr-4" : "max-w-full"
          )}
        >
          {/* SECTION 1 — After purchase */}
          {afterPurchase.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[hsl(217,91%,60%)]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Carnet d'entretien — Depuis la prise de possession
                </h3>
              </div>
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-[hsl(217,91%,60%)]/30 hidden sm:block" />
                <div className="space-y-3 sm:pl-6 relative">
                  {afterPurchase.map((ewf) => (
                    <div key={ewf.event.id} className="relative">
                      <div className="absolute -left-6 top-4 w-3.5 h-3.5 rounded-full bg-[hsl(217,91%,60%)] border-2 border-background hidden sm:block" />
                      <VinContributionCard
                        ewf={ewf}
                        isActive={ewf.event.id === selectedEventId}
                        onClick={() => setSelectedEventId(ewf.event.id)}
                        isAdmin={isAdmin}
                        onEdit={() => setEditingEwf(ewf)}
                        preferOwnerFact
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* SEPARATOR */}
          {beforePurchase.length > 0 && (
            <div className="my-8 flex items-center gap-3">
              <div className="flex-1 border-t border-dashed border-border" />
              <span className="px-3 py-1 rounded-full bg-muted text-[11px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Search className="w-3 h-3" />
                ▼ Avant l'achat — Phase d'investigation
              </span>
              <div className="flex-1 border-t border-dashed border-border" />
            </div>
          )}

          {/* SECTION 2 — Before purchase */}
          {beforePurchase.length > 0 && (
            <section className="space-y-3 opacity-60">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Avant l'achat
                </h3>
              </div>
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 border-l border-dashed border-muted-foreground/30 hidden sm:block" />
                <div className="space-y-3 sm:pl-6 relative">
                  {beforePurchase.map((ewf) => (
                    <div key={ewf.event.id} className="relative">
                      <div className="absolute -left-6 top-4 w-3 h-3 rounded-full bg-muted-foreground/30 border-2 border-background hidden sm:block" />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
                        En tant qu'acheteur potentiel
                      </p>
                      <VinContributionCard
                        ewf={ewf}
                        isActive={ewf.event.id === selectedEventId}
                        onClick={() => setSelectedEventId(ewf.event.id)}
                        isAdmin={isAdmin}
                        onEdit={() => setEditingEwf(ewf)}
                        preferOwnerFact
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Floating CTA — only for verified owner / admin */}
      {canAddLogEntry && (
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            onClick={() => setLogFormOpen(true)}
            className="bg-[hsl(170,70%,30%)] hover:bg-[hsl(170,70%,25%)] text-white shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une entrée au carnet d'entretien
          </Button>
        </div>
      )}

      {/* Detail panel */}
      <ContributionDetailPanel
        ewf={selectedEwf}
        open={panelOpen}
        onClose={() => setSelectedEventId(null)}
        profiles={{} as Record<string, ProfileMeta>}
        isAdmin={isAdmin}
        onAdminEdit={() => selectedEwf && setEditingEwf(selectedEwf)}
      />

      {/* Admin edit */}
      <AdminContributionEditDialog
        ewf={editingEwf}
        open={!!editingEwf}
        onOpenChange={(o) => { if (!o) setEditingEwf(null); }}
        vinId={vinId}
      />

      {/* Owner claim */}
      <OwnerClaimForm
        vinId={vinId}
        vin={vin}
        open={claimOpen}
        onOpenChange={setClaimOpen}
        onSuccess={() => setClaimOpen(false)}
      />

      {/* Maintenance log dialog */}
      <Dialog open={logFormOpen} onOpenChange={setLogFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
          {myContributor && (
            <MaintenanceLogForm
              vinId={vinId}
              contributor={myContributor}
              onComplete={handleLogComplete}
              onBack={() => setLogFormOpen(false)}
            />
          )}
          {!myContributor && (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Profil contributeur non trouvé. Veuillez recharger la page.
              </p>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
