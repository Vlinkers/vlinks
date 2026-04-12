import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import {
  Car,
  FileText,
  Users,
  Camera,
  Files,
  Calendar,
  AlertTriangle,
  Shield,
  Eye,
  UserPlus,
  Clock,
  DatabaseBackup,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DashboardStats {
  vins: number;
  contributions: number;
  users: number;
  documents: number;
  photos: number;
  totalEvents: number;
  pendingFacts: number;
  activeRedFlags: number;
  avgCommunityScore: number;
  avgOwnerTransparency: number;
  newContributorsThisWeek: number;
}

export default function AdminDashboard() {
  const { session } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(() => localStorage.getItem("vlinks_migration_done") === "true");
  const [stats, setStats] = useState<DashboardStats>({
    vins: 0, contributions: 0, users: 0, documents: 0, photos: 0,
    totalEvents: 0, pendingFacts: 0, activeRedFlags: 0,
    avgCommunityScore: 0, avgOwnerTransparency: 0, newContributorsThisWeek: 0,
  });

  useEffect(() => {
    const load = async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [v, c, u, d, p, ev, pf, rf, scores, nc] = await Promise.all([
        supabase.from("vins").select("id", { count: "exact", head: true }),
        supabase.from("public_contributions").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("contribution_documents").select("id", { count: "exact", head: true }),
        supabase.from("contribution_photos").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("facts").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
        supabase.from("red_flags").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("vins").select("community_score, owner_transparency_score"),
        supabase.from("contributors").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
      ]);

      let avgCS = 0, avgOT = 0;
      if (scores.data && scores.data.length > 0) {
        const withScores = scores.data.filter((s: any) => s.community_score > 0 || s.owner_transparency_score > 0);
        if (withScores.length > 0) {
          avgCS = Math.round(withScores.reduce((a: number, s: any) => a + (s.community_score || 0), 0) / withScores.length);
          avgOT = Math.round(withScores.reduce((a: number, s: any) => a + (s.owner_transparency_score || 0), 0) / withScores.length);
        }
      }

      setStats({
        vins: v.count ?? 0,
        contributions: c.count ?? 0,
        users: u.count ?? 0,
        documents: d.count ?? 0,
        photos: p.count ?? 0,
        totalEvents: ev.count ?? 0,
        pendingFacts: pf.count ?? 0,
        activeRedFlags: rf.count ?? 0,
        avgCommunityScore: avgCS,
        avgOwnerTransparency: avgOT,
        newContributorsThisWeek: nc.count ?? 0,
      });
    };
    load();
  }, []);

  const estimatedMinutes = Math.ceil(stats.pendingFacts * 1.5);

  const cards = [
    { label: "VINs", value: stats.vins, icon: Car, to: "/admin/vins", color: "text-primary" },
    { label: "Événements", value: stats.totalEvents, icon: Calendar, to: "/admin/events", color: "text-blue-500" },
    { label: "Contributions", value: stats.contributions, icon: FileText, to: "/admin/contributions", color: "text-secondary" },
    { label: "Utilisateurs", value: stats.users, icon: Users, to: "/admin/users", color: "text-accent" },
    { label: "Documents", value: stats.documents, icon: Files, to: "/admin/contributions", color: "text-warning" },
    { label: "Photos", value: stats.photos, icon: Camera, to: "/admin/contributions", color: "text-success" },
  ];

  const alertCards = [
    {
      label: "Faits en attente",
      value: stats.pendingFacts,
      icon: Clock,
      to: "/admin/contributions",
      color: stats.pendingFacts > 0 ? "text-warning" : "text-success",
      subtitle: stats.pendingFacts > 0 ? `~${estimatedMinutes} min` : "À jour",
      highlight: stats.pendingFacts > 0,
    },
    {
      label: "Red flags actifs",
      value: stats.activeRedFlags,
      icon: AlertTriangle,
      to: "/admin/red-flags",
      color: stats.activeRedFlags > 0 ? "text-destructive" : "text-muted-foreground",
      highlight: stats.activeRedFlags > 0,
    },
    {
      label: "Score communauté moy.",
      value: `${stats.avgCommunityScore}%`,
      icon: Shield,
      to: "/admin/vins",
      color: "text-primary",
    },
    {
      label: "Transparence moy.",
      value: `${stats.avgOwnerTransparency}%`,
      icon: Eye,
      to: "/admin/vins",
      color: "text-blue-500",
    },
    {
      label: "Nouveaux contributeurs",
      value: stats.newContributorsThisWeek,
      icon: UserPlus,
      to: "/admin/users",
      color: "text-success",
      subtitle: "cette semaine",
    },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Dashboard</h1>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="p-4 rounded-xl border border-border bg-card/50 hover:bg-muted/30 transition-colors"
          >
            <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
            <p className="font-display text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Alert / moderation stats */}
      <h2 className="font-display text-lg font-semibold mb-3">Modération & Confiance</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {alertCards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className={`p-4 rounded-xl border transition-colors ${
              c.highlight
                ? "border-warning/50 bg-warning/5 hover:bg-warning/10"
                : "border-border bg-card/50 hover:bg-muted/30"
            }`}
          >
            <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
            <p className="font-display text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
            {c.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{c.subtitle}</p>
            )}
          </Link>
        ))}
      </div>

      {/* Migration tool */}
      <h2 className="font-display text-lg font-semibold mb-3">Outils</h2>
      <div className="p-4 rounded-xl border border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm flex items-center gap-2">
              <DatabaseBackup className="w-4 h-4 text-muted-foreground" />
              Migration des contributions existantes
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Convertit les anciennes contributions vers le nouveau modèle (événements, faits, preuves).
            </p>
          </div>
          <Button
            variant={migrated ? "outline" : "default"}
            size="sm"
            disabled={migrating || migrated}
            onClick={async () => {
              setMigrating(true);
              try {
                const { data, error } = await supabase.functions.invoke("migrate-legacy-contributions", {
                  headers: { Authorization: `Bearer ${session?.access_token}` },
                });
                if (error) throw error;
                toast.success(
                  `Migration terminée : ${data.events_created} événements, ${data.facts_created} faits, ${data.evidence_created} preuves, ${data.red_flags_created} red flags.`
                );
                if (data.errors?.length > 0) {
                  toast.warning(`${data.errors.length} erreur(s) rencontrée(s).`);
                }
                localStorage.setItem("vlinks_migration_done", "true");
                setMigrated(true);
              } catch (err) {
                toast.error("Erreur lors de la migration.");
                console.error(err);
              } finally {
                setMigrating(false);
              }
            }}
          >
            {migrating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Migration en cours…
              </>
            ) : migrated ? (
              "Migration effectuée ✓"
            ) : (
              "Migrer les contributions"
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
