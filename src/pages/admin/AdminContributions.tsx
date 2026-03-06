import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  CheckCircle,
  XCircle,
  EyeOff,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";

interface ContributionRow {
  id: string;
  contribution_type: string;
  author_label: string;
  is_anonymous: boolean;
  is_owner_contribution: boolean;
  status: string;
  created_at: string;
  vin_id: string;
  vin?: string;
  intervention_type: string | null;
  intervention_date: string | null;
  mileage_at_intervention: number | null;
  // raw details
  rawTitle?: string;
  rawSummary?: string;
  rawDetails?: string;
}

const statusBadge = (s: string) => {
  switch (s) {
    case "approved": return <Badge className="bg-success/20 text-success border-success/30">Approuvée</Badge>;
    case "pending": return <Badge className="bg-warning/20 text-warning border-warning/30">En attente</Badge>;
    case "rejected": return <Badge className="bg-danger/20 text-danger border-danger/30">Rejetée</Badge>;
    case "hidden": return <Badge className="bg-muted text-muted-foreground border-border">Masquée</Badge>;
    default: return <Badge>{s}</Badge>;
  }
};

export default function AdminContributions() {
  const { logAction } = useAdmin();
  const { toast } = useToast();
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ContributionRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContributions = async () => {
    setLoading(true);
    let query = supabase
      .from("public_contributions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      // Get VINs for these contributions
      const vinIds = [...new Set(data.map((c) => c.vin_id))];
      const { data: vins } = await supabase
        .from("vins")
        .select("id, vin")
        .in("id", vinIds);

      const vinMap = new Map(vins?.map((v) => [v.id, v.vin]) || []);

      setContributions(
        data.map((c) => ({
          ...c,
          status: (c as any).status || "approved",
          vin: vinMap.get(c.vin_id) || "",
        }))
      );
    } else {
      setContributions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContributions();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("public_contributions")
      .update({ status })
      .eq("id", id);

    if (!error) {
      await logAction(`contribution_${status}`, "contribution", id);
      toast({ title: "Contribution mise à jour" });
      fetchContributions();
      setSelected(null);
    } else {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const deleteContribution = async (id: string) => {
    if (!confirm("Supprimer définitivement cette contribution ?")) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("public_contributions")
      .delete()
      .eq("id", id);

    if (!error) {
      await logAction("contribution_deleted", "contribution", id);
      toast({ title: "Contribution supprimée" });
      fetchContributions();
      setSelected(null);
    }
    setActionLoading(false);
  };

  const filtered = contributions.filter(
    (c) =>
      !search ||
      c.vin?.toLowerCase().includes(search.toLowerCase()) ||
      c.author_label.toLowerCase().includes(search.toLowerCase()) ||
      c.contribution_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Contributions</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par VIN, auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {["all", "approved", "pending", "rejected", "hidden"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "Tout" : s === "approved" ? "Approuvées" : s === "pending" ? "En attente" : s === "rejected" ? "Rejetées" : "Masquées"}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">VIN</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Auteur</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => setSelected(c)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{c.vin?.slice(-8) || "—"}</td>
                  <td className="px-4 py-3">{c.contribution_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{c.author_label}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("fr-CA")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {c.status !== "approved" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "approved")} title="Approuver">
                          <CheckCircle className="w-4 h-4 text-success" />
                        </Button>
                      )}
                      {c.status !== "hidden" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "hidden")} title="Masquer">
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteContribution(c.id)} title="Supprimer">
                        <Trash2 className="w-4 h-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucune contribution trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg glass-strong">
          <DialogHeader>
            <DialogTitle className="font-display">Détail de la contribution</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">VIN</p>
                  <p className="font-mono">{selected.vin}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p>{selected.contribution_type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Auteur</p>
                  <p>{selected.author_label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Statut</p>
                  {statusBadge(selected.status)}
                </div>
                {selected.intervention_type && (
                  <div>
                    <p className="text-muted-foreground">Intervention</p>
                    <p>{selected.intervention_type}</p>
                  </div>
                )}
                {selected.intervention_date && (
                  <div>
                    <p className="text-muted-foreground">Date intervention</p>
                    <p>{selected.intervention_date}</p>
                  </div>
                )}
                {selected.mileage_at_intervention && (
                  <div>
                    <p className="text-muted-foreground">Kilométrage</p>
                    <p>{selected.mileage_at_intervention.toLocaleString()} km</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  onClick={() => updateStatus(selected.id, "approved")}
                  disabled={actionLoading || selected.status === "approved"}
                  className="bg-success/20 text-success hover:bg-success/30"
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Approuver
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateStatus(selected.id, "rejected")}
                  disabled={actionLoading || selected.status === "rejected"}
                  className="bg-danger/20 text-danger hover:bg-danger/30"
                >
                  <XCircle className="w-4 h-4 mr-1" /> Rejeter
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateStatus(selected.id, selected.status === "hidden" ? "approved" : "hidden")}
                  disabled={actionLoading}
                  variant="outline"
                >
                  {selected.status === "hidden" ? (
                    <><Eye className="w-4 h-4 mr-1" /> Republier</>
                  ) : (
                    <><EyeOff className="w-4 h-4 mr-1" /> Masquer</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteContribution(selected.id)}
                  disabled={actionLoading}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
