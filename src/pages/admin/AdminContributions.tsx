import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Pencil,
  FileText,
  Camera,
} from "lucide-react";
import { ObservedSignalsPanel } from "@/components/admin/ObservedSignalsPanel";

interface ContributionRow {
  id: string;
  contribution_type: string;
  author_label: string;
  is_anonymous: boolean;
  is_owner_contribution: boolean;
  status: string;
  created_at: string;
  vin_id: string;
  user_id: string;
  vin?: string;
  intervention_type: string | null;
  intervention_date: string | null;
  mileage_at_intervention: number | null;
}

interface RawContribution {
  title: string;
  summary: string | null;
  details: string | null;
}

const statusBadge = (s: string) => {
  switch (s) {
    case "approved": return <Badge className="bg-success/20 text-success border-success/30">Approuvée</Badge>;
    case "pending": return <Badge className="bg-warning/20 text-warning border-warning/30">En attente</Badge>;
    case "rejected": return <Badge className="bg-danger/20 text-danger border-danger/30">Rejetée</Badge>;
    case "hidden": return <Badge className="bg-muted text-muted-foreground border-border">Masquée</Badge>;
    case "deleted": return <Badge className="bg-danger/10 text-danger/50 border-danger/20">Supprimée</Badge>;
    default: return <Badge>{s}</Badge>;
  }
};

export default function AdminContributions() {
  const { logAction } = useAdmin();
  const { toast } = useToast();
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selected, setSelected] = useState<ContributionRow | null>(null);
  const [rawData, setRawData] = useState<RawContribution | null>(null);
  const [documents, setDocuments] = useState<{ id: string; file_name: string }[]>([]);
  const [photos, setPhotos] = useState<{ id: string; file_name: string; file_path: string }[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  const fetchContributions = async () => {
    setLoading(true);
    let query = (supabase
      .from("public_contributions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200) as any);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;

    // Count pending
    const { count } = await (supabase
      .from("public_contributions")
      .select("id", { count: "exact", head: true }) as any)
      .eq("status", "pending");
    setPendingCount(count ?? 0);

    if (data && data.length > 0) {
      const vinIds = [...new Set(data.map((c: any) => c.vin_id))] as string[];
      const { data: vins } = await supabase
        .from("vins")
        .select("id, vin")
        .in("id", vinIds);

      const vinMap = new Map(vins?.map((v) => [v.id, v.vin]) || []);

      setContributions(
        data.map((c: any) => ({
          ...c,
          status: c.status || "approved",
          vin: vinMap.get(c.vin_id) || "",
        }))
      );
    } else {
      setContributions([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchContributions(); }, [statusFilter]);

  const openDetail = async (c: ContributionRow) => {
    setSelected(c);
    setIsEditing(false);
    setDocuments([]);
    setPhotos([]);

    // Use the public_contributions own title/summary/details (already on the row via select *)
    // Also fetch from raw_contributions by matching on the exact contribution id timeline
    const { data: raw } = await supabase
      .from("raw_contributions")
      .select("title, summary, details")
      .eq("vin_id", c.vin_id)
      .eq("user_id", c.user_id)
      .eq("contribution_type", c.contribution_type as any)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fallback: use fields from public_contributions itself
    const title = raw?.title || (c as any).title || "";
    const summary = raw?.summary || (c as any).summary || "";
    const details = raw?.details || (c as any).details || "";
    setRawData({ title, summary, details });
    setEditTitle(title);
    setEditSummary(summary);
    setEditDetails(details);

    // Fetch documents & photos via vin_contributions matching same user+vin+type
    const { data: vc } = await supabase
      .from("vin_contributions")
      .select("id")
      .eq("vin_id", c.vin_id)
      .eq("user_id", c.user_id)
      .eq("contribution_type", c.contribution_type as any)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vc) {
      const [docsRes, photosRes] = await Promise.all([
        supabase.from("contribution_documents").select("id, file_name").eq("contribution_id", vc.id),
        supabase.from("contribution_photos").select("id, file_name, file_path").eq("contribution_id", vc.id),
      ]);
      setDocuments(docsRes.data || []);
      setPhotos(photosRes.data || []);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(true);
    const { error } = await (supabase
      .from("public_contributions")
      .update({ status } as any)
      .eq("id", id) as any);

    if (!error) {
      await logAction(`contribution_${status}`, "contribution", id);
      toast({ title: `Contribution ${status === "approved" ? "approuvée" : status === "rejected" ? "rejetée" : status === "hidden" ? "masquée" : "mise à jour"}` });
      fetchContributions();
      setSelected(null);
    } else {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const softDelete = async (id: string) => {
    if (!confirm("Supprimer cette contribution ? (soft delete)")) return;
    await updateStatus(id, "deleted");
  };

  const saveEdit = async () => {
    if (!selected) return;
    setActionLoading(true);

    // Update raw_contributions
    await supabase
      .from("raw_contributions")
      .update({ title: editTitle, summary: editSummary, details: editDetails })
      .eq("vin_id", selected.vin_id)
      .eq("user_id", selected.user_id);

    await logAction("contribution_edited", "contribution", selected.id, { title: editTitle });
    toast({ title: "Contribution modifiée" });
    setIsEditing(false);
    setActionLoading(false);
  };

  const deleteDocument = async (docId: string) => {
    await supabase.from("contribution_documents").delete().eq("id", docId);
    await logAction("document_deleted", "document", docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    toast({ title: "Document supprimé" });
  };

  const deletePhoto = async (photoId: string) => {
    await supabase.from("contribution_photos").delete().eq("id", photoId);
    await logAction("photo_deleted", "photo", photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    toast({ title: "Photo supprimée" });
  };

  const filtered = contributions.filter(
    (c) =>
      !search ||
      c.vin?.toLowerCase().includes(search.toLowerCase()) ||
      c.author_label.toLowerCase().includes(search.toLowerCase()) ||
      c.contribution_type.toLowerCase().includes(search.toLowerCase())
  );

  const statusFilters = [
    { key: "pending", label: "En attente", count: pendingCount },
    { key: "approved", label: "Approuvées" },
    { key: "rejected", label: "Rejetées" },
    { key: "hidden", label: "Masquées" },
    { key: "deleted", label: "Supprimées" },
    { key: "all", label: "Tout" },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Modération</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-warning mt-1">{pendingCount} contribution{pendingCount > 1 ? "s" : ""} en attente</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par VIN, auteur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {statusFilters.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={statusFilter === s.key ? "default" : "outline"}
            onClick={() => setStatusFilter(s.key)}
            className="relative"
          >
            {s.label}
            {s.count !== undefined && s.count > 0 && (
              <span className="ml-1.5 bg-warning text-warning-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{s.count}</span>
            )}
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
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions rapides</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => openDetail(c)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{c.vin || "—"}</td>
                  <td className="px-4 py-3 capitalize">{c.contribution_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{c.author_label}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("fr-CA")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {c.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "approved")} title="Approuver">
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "rejected")} title="Rejeter">
                            <XCircle className="w-4 h-4 text-danger" />
                          </Button>
                        </>
                      )}
                      {c.status === "approved" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "hidden")} title="Masquer">
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                      {c.status === "hidden" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "approved")} title="Republier">
                          <Eye className="w-4 h-4 text-success" />
                        </Button>
                      )}
                      {c.status !== "deleted" && (
                        <Button size="sm" variant="ghost" onClick={() => softDelete(c.id)} title="Supprimer">
                          <Trash2 className="w-4 h-4 text-danger" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    {statusFilter === "pending" ? "Aucune contribution en attente 🎉" : "Aucune contribution trouvée"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl glass-strong max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Détail de la contribution</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">VIN</p>
                  <p className="font-mono text-sm">{selected.vin}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="capitalize">{selected.contribution_type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Auteur</p>
                  <p>{selected.author_label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Statut</p>
                  {statusBadge(selected.status)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p>{new Date(selected.created_at).toLocaleString("fr-CA")}</p>
                </div>
                {selected.intervention_type && (
                  <div>
                    <p className="text-muted-foreground text-xs">Intervention</p>
                    <p>{selected.intervention_type}</p>
                  </div>
                )}
                {selected.intervention_date && (
                  <div>
                    <p className="text-muted-foreground text-xs">Date intervention</p>
                    <p>{selected.intervention_date}</p>
                  </div>
                )}
                {selected.mileage_at_intervention && (
                  <div>
                    <p className="text-muted-foreground text-xs">Kilométrage</p>
                    <p>{selected.mileage_at_intervention.toLocaleString()} km</p>
                  </div>
                )}
              </div>

              {/* Raw content */}
              {rawData && (
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Contenu soumis</h3>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(!isEditing)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      {isEditing ? "Annuler" : "Modifier"}
                    </Button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Titre</label>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Résumé</label>
                        <Textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Détails</label>
                        <Textarea value={editDetails} onChange={(e) => setEditDetails(e.target.value)} rows={5} />
                      </div>
                      <Button size="sm" onClick={saveEdit} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Enregistrer
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Titre :</span>
                        <p className="font-medium">{rawData.title}</p>
                      </div>
                      {rawData.summary && (
                        <div>
                          <span className="text-muted-foreground text-xs">Résumé :</span>
                          <p className="text-foreground/90">{rawData.summary}</p>
                        </div>
                      )}
                      {rawData.details && (
                        <div>
                          <span className="text-muted-foreground text-xs">Détails :</span>
                          <p className="text-foreground/80 whitespace-pre-wrap">{rawData.details}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Documents */}
              {documents.length > 0 && (
                <div className="border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Documents ({documents.length})
                  </h3>
                  <div className="space-y-2">
                    {documents.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                        <span className="truncate">{d.file_name}</span>
                        <Button size="sm" variant="ghost" onClick={() => deleteDocument(d.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-danger" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {photos.length > 0 && (
                <div className="border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Photos ({photos.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p) => (
                      <div key={p.id} className="relative group">
                        <img src={p.file_path} alt={p.file_name} className="w-full h-20 object-cover rounded-lg" />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deletePhoto(p.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observed Signals Panel */}
              <ObservedSignalsPanel vinId={selected.vin_id} contributionId={selected.id} />

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                <Button
                  size="sm"
                  onClick={() => updateStatus(selected.id, "approved")}
                  disabled={actionLoading || selected.status === "approved"}
                  className="bg-success/20 text-success hover:bg-success/30 border border-success/30"
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Approuver
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateStatus(selected.id, "rejected")}
                  disabled={actionLoading || selected.status === "rejected"}
                  className="bg-danger/20 text-danger hover:bg-danger/30 border border-danger/30"
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
                  onClick={() => softDelete(selected.id)}
                  disabled={actionLoading || selected.status === "deleted"}
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
