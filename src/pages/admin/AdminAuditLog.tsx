import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AuditEntry {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
  admin_user_id: string;
}

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setEntries((data as AuditEntry[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Journal d'audit</h1>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Aucune action enregistrée</p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cible</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID cible</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Détails</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("fr-CA")}
                  </td>
                  <td className="px-4 py-3 font-medium">{e.action_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{e.target_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.target_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {Object.keys(e.details).length > 0 ? JSON.stringify(e.details) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
