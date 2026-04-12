import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Flag,
  Loader2,
  FileText,
  Image,
  Clock,
  Shield,
  User,
  Users,
} from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";

interface FactRow {
  id: string;
  content: string;
  face: string;
  proof_tier: string;
  moderation_status: string;
  is_anonymous: boolean;
  created_at: string;
  contributor_id: string;
  event_id: string;
  // joined
  vin?: string;
  vin_id?: string;
  event_title?: string;
  event_type?: string;
  contributor_role?: string;
  contributor_display_name?: string;
  evidence_count?: number;
  is_red_flag_related?: boolean;
}

const statusBadge = (s: string) => {
  switch (s) {
    case "approved": return <Badge className="bg-success/20 text-success border-success/30">Approuvé</Badge>;
    case "pending": return <Badge className="bg-warning/20 text-warning border-warning/30">En attente</Badge>;
    case "rejected": return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Rejeté</Badge>;
    case "flagged": return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Signalé</Badge>;
    default: return <Badge>{s}</Badge>;
  }
};

const tierBadge = (t: string) => {
  switch (t) {
    case "verified": return <Badge variant="outline" className="border-success/50 text-success text-[10px]">●●● Vérifié</Badge>;
    case "documented": return <Badge variant="outline" className="border-blue-500/50 text-blue-500 text-[10px]">●●○ Documenté</Badge>;
    case "declaration": return <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground text-[10px]">●○○ Déclaration</Badge>;
    default: return null;
  }
};

const faceBadge = (f: string) => (
  <Badge variant="outline" className={`text-[10px] ${f === "face_a" ? "border-primary/50 text-primary" : "border-blue-500/50 text-blue-500"}`}>
    {f === "face_a" ? "Face A" : "Face B"}
  </Badge>
);

const roleLabels: Record<string, string> = {
  owner_verified: "Propriétaire ✓",
  owner_unverified: "Propriétaire",
  former_owner: "Ancien proprio",
  buyer: "Acheteur",
  mechanic: "Mécanicien",
  inspector: "Inspecteur",
  dealer: "Concessionnaire",
  witness: "Témoin",
  anonymous: "Anonyme",
};

export default function AdminContributions() {
  const { logAction } = useAdmin();
  const { toast } = useToast();
  const [facts, setFacts] = useState<FactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [faceFilter, setFaceFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selected, setSelected] = useState<FactRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [evidence, setEvidence] = useState<any[]>([]);

  const fetchFacts = useCallback(async () => {
    setLoading(true);

    // Count pending
    const { count: pc } = await supabase
      .from("facts")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "pending");
    setPendingCount(pc ?? 0);

    // Fetch facts
    let query = supabase
      .from("facts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter !== "all") {
      query = query.eq("moderation_status", statusFilter as Enums<"moderation_status">);
    }
    if (faceFilter !== "all") {
      query = query.eq("face", faceFilter as Enums<"contribution_face">);
    }
    if (tierFilter !== "all") {
      query = query.eq("proof_tier", tierFilter as Enums<"proof_tier">);
    }

    const { data: factsData } = await query;
    if (!factsData || factsData.length === 0) {
      setFacts([]);
      setLoading(false);
      return;
    }

    // Fetch related data
    const eventIds = [...new Set(factsData.map((f) => f.event_id))];
    const contributorIds = [...new Set(factsData.map((f) => f.contributor_id))];

    const [eventsRes, contributorsRes, evidenceCountRes, redFlagsRes] = await Promise.all([
      supabase.from("events").select("id, title, event_type, vin_id").in("id", eventIds),
      supabase.from("contributors").select("id, display_name, role, vin_id").in("id", contributorIds),
      supabase.from("evidence").select("fact_id").in("fact_id", factsData.map((f) => f.id)),
      supabase.from("red_flags").select("supporting_facts").eq("is_active", true),
    ]);

    const eventMap = new Map((eventsRes.data || []).map((e) => [e.id, e]));
    const contributorMap = new Map((contributorsRes.data || []).map((c) => [c.id, c]));

    // Count evidence per fact
    const evidenceCounts: Record<string, number> = {};
    (evidenceCountRes.data || []).forEach((e: any) => {
      evidenceCounts[e.fact_id] = (evidenceCounts[e.fact_id] || 0) + 1;
    });

    // Red flag fact IDs
    const redFlagFactIds = new Set<string>();
    (redFlagsRes.data || []).forEach((rf: any) => {
      (rf.supporting_facts || []).forEach((fid: string) => redFlagFactIds.add(fid));
    });

    // Fetch VIN codes
    const vinIds = [...new Set((eventsRes.data || []).map((e) => e.vin_id))];
    const { data: vinsData } = await supabase.from("vins").select("id, vin").in("id", vinIds);
    const vinMap = new Map((vinsData || []).map((v) => [v.id, v.vin]));

    // Build rows - sort red flag related first, then tier3
    const rows: FactRow[] = factsData.map((f) => {
      const event = eventMap.get(f.event_id);
      const contributor = contributorMap.get(f.contributor_id);
      return {
        ...f,
        vin: event ? vinMap.get(event.vin_id) || "" : "",
        vin_id: event?.vin_id,
        event_title: event?.title || "",
        event_type: event?.event_type || "",
        contributor_role: contributor?.role || "",
        contributor_display_name: contributor?.display_name || "",
        evidence_count: evidenceCounts[f.id] || 0,
        is_red_flag_related: redFlagFactIds.has(f.id),
      };
    });

    // Priority sort: red-flag related first, then tier3
    rows.sort((a, b) => {
      if (a.is_red_flag_related && !b.is_red_flag_related) return -1;
      if (!a.is_red_flag_related && b.is_red_flag_related) return 1;
      if (a.proof_tier === "verified" && b.proof_tier !== "verified") return -1;
      if (a.proof_tier !== "verified" && b.proof_tier === "verified") return 1;
      return 0;
    });

    setFacts(rows);
    setSelectedIds(new Set());
    setLoading(false);
  }, [statusFilter, faceFilter, tierFilter]);

  useEffect(() => { fetchFacts(); }, [fetchFacts]);

  const openDetail = async (f: FactRow) => {
    setSelected(f);
    const { data } = await supabase.from("evidence").select("*").eq("fact_id", f.id);
    setEvidence(data || []);
  };

  const updateFactStatus = async (id: string, status: Enums<"moderation_status">) => {
    setActionLoading(true);
    const { error } = await supabase.from("facts").update({ moderation_status: status }).eq("id", id);
    if (!error) {
      await logAction(`fact_${status}`, "fact", id);
      toast({ title: `Fait ${status === "approved" ? "approuvé" : status === "rejected" ? "rejeté" : "signalé"}` });
      fetchFacts();
      setSelected(null);
    } else {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const bulkAction = async (status: Enums<"moderation_status">) => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    const ids = [...selectedIds];
    const { error } = await supabase.from("facts").update({ moderation_status: status }).in("id", ids);
    if (!error) {
      for (const id of ids) {
        await logAction(`fact_${status}`, "fact", id);
      }
      toast({ title: `${ids.length} fait(s) ${status === "approved" ? "approuvé(s)" : status === "rejected" ? "rejeté(s)" : "signalé(s)"}` });
      fetchFacts();
    }
    setActionLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((f) => f.id)));
    }
  };

  const filtered = facts.filter(
    (f) =>
      !search ||
      f.vin?.toLowerCase().includes(search.toLowerCase()) ||
      f.content.toLowerCase().includes(search.toLowerCase()) ||
      f.event_title?.toLowerCase().includes(search.toLowerCase())
  );

  const estimatedMinutes = Math.ceil(pendingCount * 1.5);

  const statusFilters = [
    { key: "pending", label: "En attente", count: pendingCount },
    { key: "approved", label: "Approuvés" },
    { key: "rejected", label: "Rejetés" },
    { key: "flagged", label: "Signalés" },
    { key: "all", label: "Tout" },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Modération des faits</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-warning mt-1">
              {pendingCount} fait{pendingCount > 1 ? "s" : ""} en attente · ~{estimatedMinutes} min
            </p>
          )}
        </div>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => bulkAction("approved")} disabled={actionLoading}>
              <CheckCircle className="w-4 h-4 mr-1" /> Approuver ({selectedIds.size})
            </Button>
            <Button size="sm" variant="destructive" onClick={() => bulkAction("rejected")} disabled={actionLoading}>
              <XCircle className="w-4 h-4 mr-1" /> Rejeter ({selectedIds.size})
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("flagged")} disabled={actionLoading}>
              <Flag className="w-4 h-4 mr-1" /> Signaler ({selectedIds.size})
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par VIN, contenu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {statusFilters.map((s) => (
          <Button key={s.key} size="sm" variant={statusFilter === s.key ? "default" : "outline"} onClick={() => setStatusFilter(s.key)}>
            {s.label}
            {s.count !== undefined && s.count > 0 && (
              <span className="ml-1.5 bg-warning text-warning-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{s.count}</span>
            )}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs text-muted-foreground self-center mr-1">Face:</span>
        {["all", "face_a", "face_b"].map((f) => (
          <Button key={f} size="sm" variant={faceFilter === f ? "secondary" : "ghost"} onClick={() => setFaceFilter(f)} className="text-xs h-7">
            {f === "all" ? "Toutes" : f === "face_a" ? "Face A" : "Face B"}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground self-center ml-3 mr-1">Tier:</span>
        {["all", "verified", "documented", "declaration"].map((t) => (
          <Button key={t} size="sm" variant={tierFilter === t ? "secondary" : "ghost"} onClick={() => setTierFilter(t)} className="text-xs h-7">
            {t === "all" ? "Tous" : t === "verified" ? "Vérifié" : t === "documented" ? "Documenté" : "Déclaration"}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-3 py-3 w-8">
                  <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                </th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">VIN</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Événement</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground max-w-[240px]">Contenu</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Contributeur</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Tier</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Face</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right px-3 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr
                  key={f.id}
                  className={`border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors ${
                    f.is_red_flag_related ? "bg-destructive/5" : ""
                  }`}
                  onClick={() => openDetail(f)}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(f.id)} onCheckedChange={() => toggleSelect(f.id)} />
                  </td>
                  <td className="px-3 py-3"><span className="font-mono text-xs">{f.vin?.slice(-6) || "—"}</span></td>
                  <td className="px-3 py-3 text-xs">{f.event_title || f.event_type}</td>
                  <td className="px-3 py-3 max-w-[240px]">
                    <p className="truncate text-xs">{f.content}</p>
                    {f.is_red_flag_related && (
                      <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px] mt-1">🚩 Red flag</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {f.contributor_display_name || roleLabels[f.contributor_role] || "—"}
                  </td>
                  <td className="px-3 py-3">{tierBadge(f.proof_tier)}</td>
                  <td className="px-3 py-3">{faceBadge(f.face)}</td>
                  <td className="px-3 py-3">{statusBadge(f.moderation_status)}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{new Date(f.created_at).toLocaleDateString("fr-CA")}</td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {f.moderation_status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => updateFactStatus(f.id, "approved")}><CheckCircle className="w-4 h-4 text-success" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => updateFactStatus(f.id, "rejected")}><XCircle className="w-4 h-4 text-destructive" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">
                  {statusFilter === "pending" ? "Aucun fait en attente 🎉" : "Aucun fait trouvé"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Détail du fait</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">VIN</p>
                  <p className="font-mono">{selected.vin}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Événement</p>
                  <p>{selected.event_title} ({selected.event_type})</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Contributeur</p>
                  <p>{selected.contributor_display_name || "—"} · {roleLabels[selected.contributor_role] || selected.contributor_role}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Statut</p>
                  <div className="flex items-center gap-2">{statusBadge(selected.moderation_status)} {tierBadge(selected.proof_tier)} {faceBadge(selected.face)}</div>
                </div>
              </div>

              <div className="border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-2">Contenu</h3>
                <p className="text-sm whitespace-pre-wrap">{selected.content}</p>
              </div>

              {evidence.length > 0 && (
                <div className="border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-2">Preuves ({evidence.length})</h3>
                  <div className="space-y-2">
                    {evidence.map((e: any) => (
                      <div key={e.id} className="flex items-center gap-2 text-sm">
                        {e.file_type?.startsWith("image") ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        <span>{e.file_name}</span>
                        <Badge variant="outline" className="text-[10px]">{e.evidence_type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.is_red_flag_related && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                  <p className="text-sm text-destructive font-medium">⚠️ Ce fait est lié à un red flag actif</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                {selected.moderation_status !== "approved" && (
                  <Button onClick={() => updateFactStatus(selected.id, "approved")} disabled={actionLoading}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Approuver
                  </Button>
                )}
                {selected.moderation_status !== "rejected" && (
                  <Button variant="destructive" onClick={() => updateFactStatus(selected.id, "rejected")} disabled={actionLoading}>
                    <XCircle className="w-4 h-4 mr-1" /> Rejeter
                  </Button>
                )}
                {selected.moderation_status !== "flagged" && (
                  <Button variant="outline" onClick={() => updateFactStatus(selected.id, "flagged")} disabled={actionLoading}>
                    <Flag className="w-4 h-4 mr-1" /> Signaler
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
