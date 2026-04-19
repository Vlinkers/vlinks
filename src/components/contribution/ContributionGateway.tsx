import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileUp,
  MessageSquare,
  AlertTriangle,
  LogIn,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useContributor } from "@/hooks/useContributor";
import { ContributorRoleSelector } from "@/components/ContributorRoleSelector";
import { DocumentContributionForm } from "@/components/contribution/DocumentContributionForm";
import { TestimonyContributionForm } from "@/components/contribution/TestimonyContributionForm";
import { AlertContributionForm } from "@/components/contribution/AlertContributionForm";
import type { Tables } from "@/integrations/supabase/types";

type Contributor = Tables<"contributors">;

type Door = "document" | "testimony" | "alert";

interface ContributionGatewayProps {
  vinId: string;
  contributor: Contributor | null;
  onContributionComplete: () => void;
  /** Optional: when set, success screen shows a "Voir mes contributions" button */
  onViewContributions?: () => void;
}

const DOORS: {
  id: Door;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentIcon: string;
  requiresAuth: boolean;
}[] = [
  {
    id: "document",
    icon: <FileUp className="w-8 h-8" />,
    title: "Déposer un document",
    description:
      "Ajoutez une facture, un rapport d'inspection ou tout document lié à ce véhicule",
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-50 dark:bg-blue-950/30",
    accentBorder:
      "border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600",
    accentIcon:
      "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    requiresAuth: true,
  },
  {
    id: "testimony",
    icon: <MessageSquare className="w-8 h-8" />,
    title: "Témoigner",
    description:
      "Partagez votre expérience ou vos informations sur ce véhicule",
    accent: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-50 dark:bg-emerald-950/30",
    accentBorder:
      "border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600",
    accentIcon:
      "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    requiresAuth: true,
  },
  {
    id: "alert",
    icon: <AlertTriangle className="w-8 h-8" />,
    title: "Signaler un problème",
    description:
      "Signalez un problème connu ou une anomalie observée sur ce véhicule",
    accent: "text-orange-600 dark:text-orange-400",
    accentBg: "bg-orange-50 dark:bg-orange-950/30",
    accentBorder:
      "border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600",
    accentIcon:
      "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400",
    requiresAuth: false,
  },
];

export function ContributionGateway({
  vinId,
  contributor,
  onContributionComplete,
  onViewContributions,
}: ContributionGatewayProps) {
  const { user } = useAuth();
  const { createContributor } = useContributor(vinId);
  const [selectedDoor, setSelectedDoor] = useState<Door | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [pendingDoor, setPendingDoor] = useState<Door | null>(null);
  const [localContributor, setLocalContributor] = useState<Contributor | null>(
    contributor,
  );
  const [submitted, setSubmitted] = useState(false);

  const effectiveContributor = localContributor ?? contributor;

  const handleDoorClick = (door: Door) => {
    const doorConfig = DOORS.find((d) => d.id === door)!;
    if (!user && doorConfig.requiresAuth) return;
    if (user && !effectiveContributor && door !== "alert") {
      setPendingDoor(door);
      setShowRoleSelector(true);
      return;
    }
    setSelectedDoor(door);
  };

  const handleRoleSelected = (c: Contributor) => {
    setLocalContributor(c);
    setShowRoleSelector(false);
    if (pendingDoor) {
      setSelectedDoor(pendingDoor);
      setPendingDoor(null);
    }
  };

  const handleFormComplete = () => {
    setSubmitted(true);
    onContributionComplete();
  };

  const handleBackToGateway = () => {
    setSelectedDoor(null);
    setSubmitted(false);
  };

  // ─── Success screen ────────────────────────────────────────────
  if (submitted) {
    return (
      <Card className="p-8 border-border bg-card text-center space-y-5 animate-in fade-in duration-300">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="font-display text-xl font-semibold">
            Contribution enregistrée
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Merci. Votre contribution a été soumise et sera examinée par notre
            équipe avant publication.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          {onViewContributions && (
            <Button onClick={onViewContributions}>
              Voir mes contributions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          <Button variant="outline" onClick={handleBackToGateway}>
            Ajouter une autre contribution
          </Button>
        </div>
      </Card>
    );
  }

  // ─── Role selector ─────────────────────────────────────────────
  if (showRoleSelector) {
    return (
      <ContributorRoleSelector
        vinId={vinId}
        onRoleSelected={handleRoleSelected}
        onDismiss={() => {
          setShowRoleSelector(false);
          setPendingDoor(null);
        }}
      />
    );
  }

  // ─── Active form ───────────────────────────────────────────────
  if (selectedDoor) {
    return (
      <div className="animate-in fade-in duration-200">
        {selectedDoor === "document" && effectiveContributor && (
          <DocumentContributionForm
            vinId={vinId}
            contributor={effectiveContributor}
            onComplete={handleFormComplete}
            onBack={handleBackToGateway}
          />
        )}
        {selectedDoor === "testimony" && effectiveContributor && (
          <TestimonyContributionForm
            vinId={vinId}
            contributor={effectiveContributor}
            onComplete={handleFormComplete}
            onBack={handleBackToGateway}
          />
        )}
        {selectedDoor === "alert" && (
          <AlertContributionForm
            vinId={vinId}
            contributor={effectiveContributor}
            onComplete={handleFormComplete}
            onBack={handleBackToGateway}
          />
        )}
      </div>
    );
  }

  // ─── Main gateway ──────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {!user && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <LogIn className="w-5 h-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">
            Connectez-vous pour contribuer au dossier de ce véhicule.
          </p>
          <Button size="sm" asChild>
            <a href="/auth">Se connecter</a>
          </Button>
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Contribuer au dossier
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choisissez la façon dont vous souhaitez enrichir ce dossier.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DOORS.map((door) => {
          const disabled = !user && door.requiresAuth;
          return (
            <button
              key={door.id}
              type="button"
              disabled={disabled}
              onClick={() => handleDoorClick(door.id)}
              className={`group text-left rounded-xl border-2 p-5 transition-all duration-200 ${
                door.accentBorder
              } ${door.accentBg} ${
                disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              <div
                className={`inline-flex p-2.5 rounded-lg mb-3 ${door.accentIcon}`}
              >
                {door.icon}
              </div>
              <p className={`font-semibold text-base mb-1 ${door.accent}`}>
                {door.title}
              </p>
              <p className="text-sm text-muted-foreground leading-snug">
                {door.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
