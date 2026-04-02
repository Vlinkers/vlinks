import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ContributionForm } from "@/components/ContributionForm";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { ChevronRight, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { VINDecodeResult } from "@/hooks/useVINDecode";

interface EmptyVINPageProps {
  vin: string;
  vinDecode: VINDecodeResult | null | undefined;
  currentUserId: string | null;
  handleContributeClick: () => void;
  showContributionForm: boolean;
  setShowContributionForm: (v: boolean) => void;
  showOwnerForm: boolean;
  setShowOwnerForm: (v: boolean) => void;
}

export function EmptyVINPage({
  vin, vinDecode, currentUserId, handleContributeClick,
  showContributionForm, setShowContributionForm,
  showOwnerForm, setShowOwnerForm,
}: EmptyVINPageProps) {
  const { toast } = useToast();
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [reminderSent, setReminderSent] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  const handleReminderSubmit = async () => {
    if (!reminderEmail || !vin) return;
    setReminderLoading(true);
    try {
      await supabase.from("leads").insert({ email: reminderEmail, vin });
      setReminderSent(true);
      toast({ title: "Rappel enregistré ✉️", description: "On vous écrira dans 3 jours pour savoir comment s'est passée la visite." });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Header />
      <main className="pt-20 pb-16 flex-1">
        <div className="max-w-3xl mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="vin-code">{vin}</span>
          </nav>

          {/* ═══ ACCROCHE ═══ */}
          <div className="text-center mb-10">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              Vous êtes le premier sur ce VIN.
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Ce véhicule n'a pas encore d'histoire documentée. Vous pouvez changer ça en 5 minutes — et protéger le prochain acheteur mieux que personne ne vous a protégé.
            </p>
            {vinDecode?.is_valid && (
              <p className="mt-3 font-mono text-sm text-primary tracking-wide">
                {[vinDecode.model_year, vinDecode.make, vinDecode.model].filter(Boolean).join(' ')}
              </p>
            )}
          </div>

          {/* ═══ CE QUE VOUS POUVEZ CONTRIBUER ═══ */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { emoji: "📸", title: "Une photo de l'annonce", desc: "Même une capture d'écran du prix suffit" },
              { emoji: "💬", title: "Ce que le vendeur vous a dit", desc: "Prix, kilométrage annoncé, raison de vente" },
              { emoji: "📍", title: "L'état général vu à distance", desc: "Ce que vous avez remarqué sur les photos" },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-primary/[0.03] p-5 text-center">
                <span className="text-2xl mb-2 block">{item.emoji}</span>
                <h3 className="font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mb-10">
            Après votre visite, vous pourrez ajouter photos, rapport d'inspection, et observations terrain.
          </p>

          {/* ═══ CTA PRINCIPAL ═══ */}
          <div className="text-center mb-3">
            <Button size="xl" onClick={handleContributeClick} className="px-10">
              {currentUserId ? "Démarrer ce dossier" : "Se connecter pour démarrer"}
            </Button>
          </div>

          {/* ═══ CTA SECONDAIRE ═══ */}
          <div className="text-center mb-14">
            <button
              onClick={() => setShowReminderModal(true)}
              className="text-sm text-primary hover:underline underline-offset-4 transition-colors"
            >
              Me rappeler après ma visite →
            </button>
          </div>

          {/* ═══ PREUVE SOCIALE INVERSÉE ═══ */}
          <div className="rounded-xl border border-border bg-muted/50 p-6 mb-6">
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Les dossiers les plus utiles de VLINKS ont tous commencé par un seul contributeur. Le dossier Porsche Cayenne ci-dessous a permis à 3 acheteurs d'éviter un mauvais achat — grâce à une première personne qui a fait exactement ce qu'on vous propose.
            </p>
            <Link
              to="/vin/WP1AD2A25DLA72609"
              className="block rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-foreground text-sm">Porsche Cayenne</p>
                  <p className="font-mono text-xs text-primary tracking-wide mt-0.5">WP1AD2A25DLA72609</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Voir le dossier</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          </div>

          {/* Lien propriétaire */}
          {currentUserId && (
            <p className="text-center text-xs text-muted-foreground">
              <button onClick={() => setShowOwnerForm(true)} className="hover:text-foreground underline underline-offset-2 transition-colors">
                Vous êtes le propriétaire ? Revendiquer ce VIN (beta)
              </button>
            </p>
          )}
        </div>
      </main>
      <Footer />

      {/* Reminder modal */}
      <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Me rappeler après ma visite</DialogTitle>
            <DialogDescription>
              Entrez votre email — on vous écrira dans 3 jours pour savoir comment s'est passée la visite.
            </DialogDescription>
          </DialogHeader>
          {reminderSent ? (
            <div className="py-6 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium">Rappel enregistré !</p>
              <p className="text-xs text-muted-foreground mt-1">
                On vous écrira dans 3 jours pour savoir comment s'est passée la visite.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <Input
                type="email"
                placeholder="votre@email.com"
                value={reminderEmail}
                onChange={(e) => setReminderEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                VIN en contexte : <span className="font-mono text-primary">{vin}</span>
              </p>
              <Button
                className="w-full"
                onClick={handleReminderSubmit}
                disabled={!reminderEmail || reminderLoading}
              >
                {reminderLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Envoyer le rappel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {currentUserId && (
        <>
          <ContributionForm vinId={null} vin={vin} open={showContributionForm} onOpenChange={setShowContributionForm} />
          <OwnerClaimForm vinId={null} vin={vin} open={showOwnerForm} onOpenChange={setShowOwnerForm} />
        </>
      )}
    </div>
  );
}
