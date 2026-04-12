import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState, useCallback } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  Pencil,
  Trash2,
  Merge,
  CheckCircle,
  Shield,
} from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import type { Enums } from "@/integrations/supabase/types";

interface EventRow {
  id: string;
  vin_id: string;
  event_type: string;
  event_date: string | null;
  title: string;
  description: string | null;
  mileage_at_event: number | null;
  facts_count: number;
  face_a_count: number;
  face_b_count: number;
  is_verified: boolean;
  phase_id: string | null;
  created_at: string;
  vin?: string;
}

const eventTypeLabels: Record<string, string> = {
  purchase: "Achat", sale: "Vente", accident: "Accident", repair: "Réparation",
  maintenance: "Entretien", inspection: "Inspection", modification: "Modification",
  recall: "Rappel", insurance_claim: "Réclamation", listing: "Annonce",
  import_export: "Import/Export", registration: "Immatriculation",
  mileage_record: "Relevé km", other: "Autre",
};

export default function AdminEvents() {
  const { logAction } = useAdmin();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("");
  const [editDate, setEditDate] = useState("");
  const [mergeTarget, setMergeTarget] = useState<EventRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (!data || data.length === 0) { setEvents([]); setLoading(false); return; }

    const vinIds = [...new Set(data.map((e) => e.vin_id))];
    const { data: vins } = await supabase.from("vins").select("id, vin").in("id", vinIds);
    const vinMap = new Map((vins || []).map((v) => [v.id, v.vin]));

    setEvents(data.map((e) => ({
      ...e,
      facts_count: e.facts_count ?? 0,
      face_a_count: e.face_a_count ?? 0,
      face_b_count: e.face_b_count ?? 0,
      is_verified: e.is_verified ?? false,
      vin: vinMap.get(e.vin_id) || "",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const openEdit = (e: EventRow) => {
    setSelected(e);
    setEditMode(true);
    setEditTitle(e.title);
    setEditType(e.event_type);
    setEditDate(e.event_date || "");
  };

  const saveEdit = async () => {
    if (!selected) return;
    setActionLoading(true);
    const { error } = await supabase.from("events").update({
      title: editTitle,
      event_type: editType as Enums<"event_type">,
      event_date: editDate || null,
    }).eq("id", selected.id);

    if (!error) {
      await logAction("event_edited", "event", selected.id, { title: editTitle, event_type: editType });
      toast({ title: "Événement modifié" });
      fetchEvents();
      setSelected(null);
      setEditMode(false);
    } else {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const deleteEvent = async (e: EventRow) => {
    if (!confirm(`Supprimer l'événement "${e.title}" et ses ${e.facts_count} fait(s) associés ?`)) return;
    setActionLoading(true);

    // Delete evidence, then facts, then event
    const { data: facts } = await supabase.from("facts").select("id").eq("event_id", e.id);
    if (facts && facts.length > 0) {
      const factIds = facts.map((f) => f.id);
      await supabase.from("evidence").delete().in("fact_id", factIds);
      await supabase.from("facts").delete().in("id", factIds);
    }
    const { error } = await supabase.from("events").delete().eq("id", e.id);

    if (!error) {
      await logAction("event_deleted", "event", e.id, { title: e.title });
      toast({ title: "Événement supprimé" });
      fetchEvents();
    } else {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const mergeEvents = async () => {
    if (!selected || !mergeTarget || selected.id === mergeTarget.id) return;
    if (!confirm(`Fusionner "${mergeTarget.title}" dans "${selected.title}" ? Les faits seront transférés.`)) return;
    setActionLoading(true);

    // Move facts from mergeTarget to selected
    await supabase.from("facts").update({ event_id: selected.id }).eq("event_id", mergeTarget.id);
    // Delete the merged event
    await supabase.from("events").delete().eq("id", mergeTarget.id);
    await logAction("event_merged", "event", selected.id, { merged_from: mergeTarget.id, merged_title: mergeTarget.title });
    toast({ title: "Événements fusionnés" });
    fetchEvents();
    setSelected(null);
    setMergeTarget(null);
    setActionLoading(false);
  };

  const filtered = events.filter(
    (e) => !search || e.vin?.toLowerCase().includes(search.toLowerCase()) || e.title.toLowerCase().includes(search.toLowerCase())
  );

  // Same-VIN events for merge
  const mergeOptions = selected ? events.filter((e) => e.vin_id === selected.vin_id && e.id !== selected.id) : [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Événements</h1>
        <Badge variant="outline">{events.length} total</Badge>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par VIN, titre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Titre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Faits</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vérifié</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3"><span className="font-mono text-xs">{e.vin?.slice(-6) || "—"}</span></td>
                  <td className="px-4 py-3 text-xs">{eventTypeLabels[e.event_type] || e.event_type}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.event_date || "—"}</td>
                  <td className="px-4 py-3 text-xs max-w-[250px] truncate">{e.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs">
                      <span>{e.facts_count}</span>
                      <span className="text-muted-foreground">({e.face_a_count}A / {e.face_b_count}B)</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {e.is_verified ? <Shield className="w-4 h-4 text-success" /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteEvent(e)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Aucun événement trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Merge dialog */}
      <Dialog open={editMode && !!selected} onOpenChange={() => { setEditMode(false); setSelected(null); setMergeTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Modifier l'événement</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Titre</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.event_type.map((t) => (
                      <SelectItem key={t} value={t}>{eventTypeLabels[t] || t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <Button onClick={saveEdit} disabled={actionLoading} className="w-full">
                <CheckCircle className="w-4 h-4 mr-2" /> Enregistrer
              </Button>

              {/* Merge section */}
              {mergeOptions.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Merge className="w-4 h-4" /> Fusionner avec</h4>
                  <Select value={mergeTarget?.id || ""} onValueChange={(id) => setMergeTarget(mergeOptions.find((e) => e.id === id) || null)}>
                    <SelectTrigger><SelectValue placeholder="Choisir un événement" /></SelectTrigger>
                    <SelectContent>
                      {mergeOptions.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.title} ({e.event_date || "sans date"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mergeTarget && (
                    <Button variant="destructive" className="w-full mt-2" onClick={mergeEvents} disabled={actionLoading}>
                      Fusionner "{mergeTarget.title}" → "{selected.title}"
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
