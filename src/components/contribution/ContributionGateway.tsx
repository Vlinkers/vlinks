import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, MessageSquare, AlertTriangle, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useContributor } from "@/hooks/useContributor";
import { ContributorRoleSelector } from "@/components/ContributorRoleSelector";
import type { Tables } from "@/integrations/supabase/types";

type Contributor = Tables<"contributors">;

type Door = "document" | "testimony" | "alert";

interface ContributionGatewayProps {
  vinId: string;
  contributor: Contributor | null;
  onContributionComplete: () => void;
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
    description: "Facture, rapport d'inspection, certificat, photo, capture d'annonce",
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-50 dark:bg-blue-950/30",
    accentBorder: "border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600",
    accentIcon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    requiresAuth: true,
  },
  {
    id: "testimony",
    icon: <MessageSquare className="w-8 h-8" />,
    title: "Témoigner",
    description: "Vous avez vu, entendu ou constaté quelque chose sur ce véhicule",
    accent: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-50 dark:bg-emerald-950/30",
    accentBorder: "border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600",
    accentIcon: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    requiresAuth: true,
  },
  {
    id: "alert",
    icon: <AlertTriangle className="w-8 h-8" />,
    title: "Signaler un problème",
    description: "Odomètre suspect, dommage caché, historique douteux, arnaque",
    accent: "text-orange-600 dark:text-orange-400",
    accentBg: "bg-orange-50 dark:bg-orange-950/30",
    accentBorder: "border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600",
    accentIcon: "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400",
    requiresAuth: false,
  },
];

export function ContributionGateway({
  vinId,
  contributor,
  onContributionComplete,
}: ContributionGatewayProps) {
  const { user } = useAuth();
  const { createContributor } = useContributor(vinId);
  const [selectedDoor, setSelectedDoor] = useState<Door | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [pendingDoor, setPendingDoor] = useState<Door | null>(null);
  const [localContributor, setLocalContributor] = useState<Contributor | null>(contributor);

  const effectiveContributor = localContributor ?? contributor;

  const handleDoorClick = (door: Door) => {
    const doorConfig = DOORS.find((d) => d.id === door)!;

    // Anonymous alert is allowed
    if (!user && doorConfig.requiresAuth) return;

    // Need contributor record first (except anonymous alert)
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

  // Role selector step
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

  // Form step — placeholder until sub-forms are created
  if (selectedDoor) {
    const doorConfig = DOORS.find((d) => d.id === selectedDoor)!;
    return (
      <Card className="p-6 space-y-4 border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${doorConfig.accentIcon}`}>
              {doorConfig.icon}
            </div>
            <h3 className="font-display text-lg font-semibold">{doorConfig.title}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDoor(null)}
          >
            Retour
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Formulaire « {doorConfig.title} » — à connecter au composant dédié.
        </p>
      </Card>
    );
  }

  // Main gateway
  return (
    <div className="space-y-4">
      {/* Auth banner */}
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

      <h3 className="font-display text-lg font-semibold">
        Comment voulez-vous contribuer à ce dossier ?
      </h3>

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
              <div className={`inline-flex p-2.5 rounded-lg mb-3 ${door.accentIcon}`}>
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
