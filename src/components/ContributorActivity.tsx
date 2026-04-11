import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  FileCheck,
  Car,
  Award,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  BarChart3,
} from "lucide-react";

interface ContributorActivityProps {
  userId: string;
}

const TRUST_LEVELS: Record<string, { label: string; color: string; progress: number }> = {
  new: { label: "Nouveau", color: "bg-muted text-muted-foreground border-border", progress: 10 },
  active: { label: "Actif", color: "bg-blue-500/15 text-blue-600 border-blue-500/30", progress: 40 },
  trusted: { label: "Fiable", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", progress: 70 },
  expert: { label: "Expert", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", progress: 100 },
};

const ROLE_LABELS: Record<string, string> = {
  owner_verified: "Propriétaire vérifié",
  owner_unverified: "Propriétaire",
  former_owner: "Ancien propriétaire",
  buyer: "Acheteur",
  mechanic: "Mécanicien",
  inspector: "Inspecteur",
  dealer: "Concessionnaire",
  witness: "Témoin",
  anonymous: "Anonyme",
};

const PROOF_TIER_BADGE: Record<string, { label: string; className: string }> = {
  declaration: { label: "Déclaration", className: "bg-muted text-muted-foreground" },
  documented: { label: "Documenté", className: "bg-blue-500/15 text-blue-600" },
  verified: { label: "Vérifié", className: "bg-emerald-500/15 text-emerald-600" },
};

const VERIFICATION_TIER_LABELS: Record<string, string> = {
  certificate_only: "Certificat uniquement",
  certificate_plus_vin: "Certificat + Plaque VIN",
  chain_of_trust: "Chaîne de confiance",
};

export function ContributorActivity({ userId }: ContributorActivityProps) {
  // Fetch extended profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-activity", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("total_facts_count, tier3_facts_count, vins_contributed_to, trust_level, verification_tier")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch contributor roles across VINs
  const { data: contributorRoles = [] } = useQuery({
    queryKey: ["contributor-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributors")
        .select("id, role, vin_id, vins!contributors_vin_id_fkey(vin)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as Array<{ id: string; role: string; vin_id: string; vins: { vin: string } | null }>;
    },
  });

  // Fetch recent facts
  const { data: recentFacts = [] } = useQuery({
    queryKey: ["recent-facts", userId],
    queryFn: async () => {
      // Get contributor IDs for this user
      const { data: contribs } = await supabase
        .from("contributors")
        .select("id")
        .eq("user_id", userId);

      if (!contribs || contribs.length === 0) return [];

      const contribIds = contribs.map((c) => c.id);
      const { data, error } = await supabase
        .from("facts")
        .select("id, content, proof_tier, created_at, event_id, events!facts_event_id_fkey(title)")
        .in("contributor_id", contribIds)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        content: string;
        proof_tier: string | null;
        created_at: string;
        event_id: string;
        events: { title: string } | null;
      }>;
    },
  });

  if (profileLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const trustLevel = (profile?.trust_level as string) || "new";
  const trustInfo = TRUST_LEVELS[trustLevel] || TRUST_LEVELS.new;

  return (
    <div className="space-y-4">
      {/* Trust Level + Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Mon activité de contributeur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Trust Badge */}
          <div className="flex items-center gap-3">
            <Badge className={`text-sm px-3 py-1 ${trustInfo.color}`}>
              {trustInfo.label}
            </Badge>
            <div className="flex-1">
              <Progress value={trustInfo.progress} className="h-2" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<FileCheck className="w-4 h-4" />}
              label="Faits déposés"
              value={profile?.total_facts_count ?? 0}
            />
            <StatCard
              icon={<Shield className="w-4 h-4" />}
              label="Preuves vérifiées"
              value={profile?.tier3_facts_count ?? 0}
            />
            <StatCard
              icon={<Car className="w-4 h-4" />}
              label="Véhicules documentés"
              value={profile?.vins_contributed_to ?? 0}
            />
            <StatCard
              icon={<Award className="w-4 h-4" />}
              label="Niveau de confiance"
              value={trustInfo.label}
              isText
            />
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      {profile?.verification_tier && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Vérification de propriété
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                {VERIFICATION_TIER_LABELS[profile.verification_tier as string] || profile.verification_tier}
              </Badge>
              <div className="flex gap-1">
                {["certificate_only", "certificate_plus_vin", "chain_of_trust"].map((tier, i) => (
                  <div
                    key={tier}
                    className={`w-8 h-1.5 rounded-full ${
                      ["certificate_only", "certificate_plus_vin", "chain_of_trust"].indexOf(profile.verification_tier as string) >= i
                        ? "bg-emerald-500"
                        : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roles across vehicles */}
      {contributorRoles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rôles par véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contributorRoles.map((cr) => (
                <Link
                  key={cr.id}
                  to={`/vin/${cr.vins?.vin}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs font-mono text-muted-foreground truncate">
                      {cr.vins?.vin || "N/A"}
                    </code>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {ROLE_LABELS[cr.role] || cr.role}
                    </Badge>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Facts */}
      {recentFacts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFacts.map((fact) => (
                <div key={fact.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    {fact.events?.title && (
                      <p className="text-xs font-medium text-foreground truncate">
                        {fact.events.title}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {fact.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {fact.proof_tier && PROOF_TIER_BADGE[fact.proof_tier] && (
                        <Badge className={`text-[10px] px-1.5 py-0 ${PROOF_TIER_BADGE[fact.proof_tier].className}`}>
                          {PROOF_TIER_BADGE[fact.proof_tier].label}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(fact.created_at).toLocaleDateString("fr-CA")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  isText = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-bold ${isText ? "text-sm" : "text-xl"} text-foreground`}>
        {value}
      </p>
    </div>
  );
}
