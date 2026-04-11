import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  Key,
  History,
  Wrench,
  ClipboardCheck,
  Eye,
  X,
  Loader2,
  CheckCircle,
  Users,
  Shield,
} from "lucide-react";
import { useContributor } from "@/hooks/useContributor";
import type { Enums, Tables } from "@/integrations/supabase/types";

type ContributorRole = Enums<"contributor_role">;
type Contributor = Tables<"contributors">;

interface ContributorRoleSelectorProps {
  vinId: string;
  onRoleSelected: (contributor: Contributor) => void;
  onDismiss: () => void;
}

const FACE_A_ROLES: ContributorRole[] = ["buyer", "mechanic", "inspector", "witness", "anonymous"];
const FACE_B_ROLES: ContributorRole[] = ["owner_verified", "owner_unverified", "former_owner", "dealer"];

interface RoleOption {
  role: ContributorRole;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const roleOptions: RoleOption[] = [
  {
    role: "buyer",
    label: "Acheteur potentiel",
    description: "Je considère acheter ce véhicule ou je fais des recherches",
    icon: <Search className="w-6 h-6" />,
  },
  {
    role: "owner_unverified",
    label: "Propriétaire actuel",
    description: "Je suis le propriétaire actuel de ce véhicule",
    icon: <Key className="w-6 h-6" />,
  },
  {
    role: "former_owner",
    label: "Ancien propriétaire",
    description: "J'ai déjà possédé ce véhicule",
    icon: <History className="w-6 h-6" />,
  },
  {
    role: "mechanic",
    label: "Mécanicien / Garagiste",
    description: "J'ai travaillé sur ce véhicule professionnellement",
    icon: <Wrench className="w-6 h-6" />,
  },
  {
    role: "inspector",
    label: "Inspecteur",
    description: "J'ai inspecté ce véhicule",
    icon: <ClipboardCheck className="w-6 h-6" />,
  },
  {
    role: "witness",
    label: "Témoin",
    description: "J'ai des informations sur ce véhicule",
    icon: <Eye className="w-6 h-6" />,
  },
];

export function ContributorRoleSelector({
  vinId,
  onRoleSelected,
  onDismiss,
}: ContributorRoleSelectorProps) {
  const { createContributor } = useContributor(vinId);
  const [isCreating, setIsCreating] = useState(false);
  const [createdContributor, setCreatedContributor] = useState<Contributor | null>(null);
  const [selectedRole, setSelectedRole] = useState<ContributorRole | null>(null);

  const handleSelect = async (role: ContributorRole) => {
    setSelectedRole(role);
    setIsCreating(true);
    try {
      const contributor = await createContributor(role);
      setCreatedContributor(contributor);
      // Brief delay to show confirmation before callback
      setTimeout(() => onRoleSelected(contributor), 1500);
    } catch (err) {
      console.error("Error creating contributor:", err);
      setSelectedRole(null);
    } finally {
      setIsCreating(false);
    }
  };

  const isFaceB = selectedRole ? FACE_B_ROLES.includes(selectedRole) : false;

  // Confirmation state
  if (createdContributor) {
    return (
      <Card className="p-6 space-y-4 border-border bg-card">
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
          <h3 className="font-display text-lg font-semibold">Rôle enregistré</h3>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            isFaceB
              ? "bg-primary/10 text-primary border border-primary/30"
              : "bg-accent/50 text-accent-foreground border border-accent"
          }`}>
            {isFaceB ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            {isFaceB ? "Espace propriétaire" : "Dossier communautaire"}
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isFaceB
              ? "Vos contributions apparaîtront dans l'espace propriétaire"
              : "Vos contributions apparaîtront dans le dossier communautaire"}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4 border-border bg-card relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-3 right-3 h-7 w-7 p-0"
        onClick={onDismiss}
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="space-y-1 pr-8">
        <h3 className="font-display text-lg font-semibold">
          Quel est votre lien avec ce véhicule ?
        </h3>
        <p className="text-sm text-muted-foreground">
          Cela détermine comment vos contributions seront présentées.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {roleOptions.map((option) => (
          <button
            key={option.role}
            type="button"
            disabled={isCreating}
            onClick={() => handleSelect(option.role)}
            className={`flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all ${
              selectedRole === option.role
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40 hover:bg-muted/30 bg-muted/10"
            } ${isCreating && selectedRole !== option.role ? "opacity-40 pointer-events-none" : ""}`}
          >
            <div className={`${selectedRole === option.role ? "text-primary" : "text-muted-foreground"}`}>
              {isCreating && selectedRole === option.role ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                option.icon
              )}
            </div>
            <div>
              <p className={`font-medium text-sm leading-tight ${
                selectedRole === option.role ? "text-primary" : "text-foreground"
              }`}>
                {option.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
