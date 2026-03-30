import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";

interface VINRow {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  trust_score: number | null;
  contributions_count: number | null;
  created_at: string;
}

export default function AdminVINs() {
  const { logAction } = useAdmin();
  const { toast } = useToast();
  const [vins, setVins] = useState<VINRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchVINs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vins")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setVins(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVINs(); }, []);

  const deleteVIN = async (id: string, vin: string) => {
    if (!confirm(`Supprimer le VIN ${vin} et toutes ses données ?`)) return;
    const { error } = await supabase.from("vins").delete().eq("id", id);
    if (!error) {
      await logAction("vin_deleted", "vin", id, { vin });
      toast({ title: "VIN supprimé" });
      fetchVINs();
    }
  };

  const filtered = vins.filter(
    (v) =>
      !search ||
      v.vin.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">VINs</h1>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher par VIN, marque..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">VIN</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Véhicule</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Score</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contributions</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3"><span className="vin-code">{v.vin}</span></td>
                  <td className="px-4 py-3">{[v.year, v.make, v.model].filter(Boolean).join(" ") || "—"}</td>
                  <td className="px-4 py-3">{v.trust_score ?? 0}</td>
                  <td className="px-4 py-3">{v.contributions_count ?? 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(v.created_at).toLocaleDateString("fr-CA")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/vin/${v.vin}`}><ExternalLink className="w-4 h-4" /></Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteVIN(v.id, v.vin)}>
                        <Trash2 className="w-4 h-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Aucun VIN trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
