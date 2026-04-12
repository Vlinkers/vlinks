import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  ShieldOff,
  AlertTriangle,
  Bot,
} from "lucide-react";

interface RedFlagRow {
  id: string;
  vin_id: string;
  flag_type: string;
  severity: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  supporting_facts: string[];
  vin?: string;
}

const severityBadge = (s: string) => {
  switch (s) {
    case "critical": return <Badge className="bg-destructive text-destructive-foreground">Critique</Badge>;
    case "high": return <Badge className="bg-orange-600 text-white">Élevé</Badge>;
    case "medium": return <Badge className="bg-warning/20 text-warning border-warning/30">Moyen</Badge>;
    case "low": return <Badge variant="outline" className="text-muted-foreground">Faible</Badge>;
    default: return <Badge>{s}</Badge>;
  }
};

const flagTypeLabels: Record<string, string> = {
  odometer_rollback: "Recul d'odomètre",
  title_wash: "Lavage de titre",
  flood_damage: "Dommage d'inondation",
  frame_damage: "Dommage structural",
  stolen: "Véhicule volé",
  lemon: "Véhicule citron",
  salvage_rebuilt: "Reconstruit",
  inconsistent_history: "Historique incohérent",
  suspicious_listing: "Annonce suspecte",
  other: "Autre",
};

export default function AdminRedFlags() {
  const { logAction } = useAdmin();
  const { toast } = useToast();
  const [flags, setFlags] = useState<RedFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("active");
  const [selected, setSelected] = useState<RedFlagRow | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("red_flags").select("*").order("created_at", { ascending: false }).limit(200);

    if (activeFilter === "active") query = query.eq("is_active", true);
    else if (activeFilter === "resolved") query = query.eq("is_active", false);

    if (severityFilter !== "all") query = query.eq("severity", severityFilter);

    const { data } = await query;
    if (!data || data.length === 0) { setFlags([]); setLoading(false); return; }

    const vinIds = [...new Set(data.map((f) => f.vin_id))];
    const { data: vins } = await supabase.from("vins").select("id, vin").in("id", vinIds);
    const vinMap = new Map((vins || []).map((v) => [v.id, v.vin]));

    setFlags(data.map((f) => ({ ...f, vin: vinMap.get(f.vin_id) || "" })));
    setLoading(false);
  }, [severityFilter, activeFilter]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const deactivateFlag = async (id: string) => {
    setActionLoading(true);
    const { error } = await supabase.from("red_flags").update({
      is_active: false,
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes || "Faux positif",
    } as any).eq("id", id);

    if (!error) {
      await logAction("red_flag_deactivated", "red_flag", id, { resolution_notes: resolutionNotes });
      toast({ title: "Red flag désactivé" });
      fetchFlags();
      setSelected(null);
    } else {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const isAutoDetected = (rf: RedFlagRow) => {
    return rf.title.startsWith("Recul d'odometre detecte:") || rf.title.startsWith("Saut kilometrique");
  };

  const filtered = flags.filter(
    (f) => !search || f.vin?.toLowerCase().includes(search.toLowerCase()) || f.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Red Flags</h1>
        <Badge variant="outline">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</Badge>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par VIN, titre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {["active", "resolved", "all"].map((f) => (
          <Button key={f} size="sm" variant={activeFilter === f ? "default" : "outline"} onClick={() => setActiveFilter(f)}>
            {f === "active" ? "Actifs" : f === "resolved" ? "Résolus" : "Tout"}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground self-center ml-2 mr-1">Sévérité:</span>
        {["all", "critical", "high", "medium", "low"].map((s) => (
          <Button key={s} size="sm" variant={severityFilter === s ? "secondary" : "ghost"} onClick={() => setSeverityFilter(s)} className="text-xs h-7">
            {s === "all" ? "Toutes" : s === "critical" ? "Critique" : s === "high" ? "Élevé" : s === "medium" ? "Moyen" : "Faible"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">VIN</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sévérité</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Titre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => { setSelected(f); setResolutionNotes(f.resolution_notes || ""); }}>
                  <td className="px-4 py-3"><span className="font-mono text-xs">{f.vin?.slice(-6) || "—"}</span></td>
                  <td className="px-4 py-3 text-xs">{flagTypeLabels[f.flag_type] || f.flag_type}</td>
                  <td className="px-4 py-3">{severityBadge(f.severity)}</td>
                  <td className="px-4 py-3 text-xs max-w-[300px] truncate">
                    <div className="flex items-center gap-1.5">
                      {isAutoDetected(f) && <Bot className="w-3.5 h-3.5 text-blue-500 shrink-0" title="Auto-détecté" />}
                      {f.title}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {f.is_active
                      ? <Badge className="bg-destructive/20 text-destructive border-destructive/30">Actif</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Résolu</Badge>
                    }
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(f.created_at).toLocaleDateString("fr-CA")}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {f.is_active && (
                      <Button size="sm" variant="ghost" onClick={() => { setSelected(f); setResolutionNotes(""); }}>
                        <ShieldOff className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Aucun red flag trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Détail du red flag
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">VIN</p><p className="font-mono">{selected.vin}</p></div>
                <div><p className="text-muted-foreground text-xs">Type</p><p>{flagTypeLabels[selected.flag_type]}</p></div>
                <div><p className="text-muted-foreground text-xs">Sévérité</p>{severityBadge(selected.severity)}</div>
                <div>
                  <p className="text-muted-foreground text-xs">Source</p>
                  {isAutoDetected(selected) ? <Badge variant="outline" className="text-blue-500 border-blue-500/30"><Bot className="w-3 h-3 mr-1" />Auto-détecté</Badge> : <span className="text-sm">Signalement utilisateur</span>}
                </div>
              </div>

              <div className="border border-border rounded-xl p-3">
                <p className="text-sm font-semibold mb-1">{selected.title}</p>
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
              </div>

              {selected.supporting_facts.length > 0 && (
                <p className="text-xs text-muted-foreground">{selected.supporting_facts.length} fait(s) de support</p>
              )}

              {selected.is_active ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Notes de résolution (faux positif, corrigé, etc.)"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                  <Button variant="destructive" className="w-full" onClick={() => deactivateFlag(selected.id)} disabled={actionLoading}>
                    <ShieldOff className="w-4 h-4 mr-2" /> Désactiver ce red flag
                  </Button>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-xl p-3 text-sm">
                  <p className="text-muted-foreground">Résolu le {selected.resolved_at ? new Date(selected.resolved_at).toLocaleDateString("fr-CA") : "—"}</p>
                  {selected.resolution_notes && <p className="mt-1">{selected.resolution_notes}</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
