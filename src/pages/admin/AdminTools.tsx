// TEMPORARY ADMIN TOOL — remove after data cleanup
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

export default function AdminTools() {
  const { session } = useAuth();
  const [vin, setVin] = useState("WP1AD2A20DLA79693");
  const [sourceUsername, setSourceUsername] = useState("thirdvlinker");
  const [destUsername, setDestUsername] = useState("FirstVlinker");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [executing, setExecuting] = useState(false);

  const resolveUserId = async (username: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username")
      .ilike("username", username.trim())
      .maybeSingle();
    if (error) throw new Error(`Recherche "${username}": ${error.message}`);
    if (!data) throw new Error(`Profil introuvable: ${username}`);
    return data.user_id as string;
  };

  const callFn = async (mode: "preview" | "execute") => {
    const sourceId = await resolveUserId(sourceUsername);
    const destId = await resolveUserId(destUsername);
    if (sourceId === destId) throw new Error("Source et destination identiques");
    const { data, error } = await supabase.functions.invoke("admin-reassign-contributions", {
      body: { vin: vin.trim(), source_user_id: sourceId, destination_user_id: destId, mode },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const onPreview = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const data = await callFn("preview");
      setPreview((data as any).inventory);
      toast.success("Prévisualisation chargée");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onExecute = async () => {
    if (!confirm(`Confirmer la réattribution de toutes les contributions de "${sourceUsername}" vers "${destUsername}" sur le VIN ${vin} ?`)) return;
    setExecuting(true);
    try {
      const data = await callFn("execute");
      const r = (data as any).result;
      toast.success(
        `Réattribution effectuée : ${r.facts_reassigned} faits, ${r.public_contributions} contributions publiques, ${r.raw_contributions} brutes, ${r.vin_contributions} legacy, ${r.owner_verifications} vérifications.`
      );
      setPreview(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-2">Outils admin</h1>
      <p className="text-sm text-muted-foreground mb-6">
        ⚠️ Outil temporaire. À retirer après le nettoyage des données de test.
      </p>

      <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 mb-6 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Réattribution de contributions</p>
          <p className="text-muted-foreground">
            Transfère toutes les contributions (faits, preuves, contributions publiques/legacy, vérifications) d'un utilisateur source vers un utilisateur destination, sur un VIN précis.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4 max-w-xl">
        <div>
          <Label htmlFor="vin">VIN concerné</Label>
          <Input id="vin" value={vin} onChange={(e) => setVin(e.target.value)} placeholder="WP1AD2A20DLA79693" />
        </div>
        <div>
          <Label htmlFor="src">Pseudonyme source</Label>
          <Input id="src" value={sourceUsername} onChange={(e) => setSourceUsername(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dst">Pseudonyme destination</Label>
          <Input id="dst" value={destUsername} onChange={(e) => setDestUsername(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onPreview} disabled={loading || executing}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Prévisualiser
          </Button>
          <Button variant="destructive" onClick={onExecute} disabled={!preview || executing || loading}>
            {executing && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmer la réattribution
          </Button>
        </div>
      </div>

      {preview && (
        <div className="mt-6 max-w-3xl rounded-xl border border-border bg-card/50 p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Prévisualisation</h2>
          <div className="text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">VIN :</span> {preview.vin}
            </p>
            <p>
              <span className="text-muted-foreground">Contributeur source :</span>{" "}
              {preview.source_contributor ? `${preview.source_contributor.display_name ?? "—"} (${preview.source_contributor.role}, ${preview.source_contributor.facts_count} faits)` : "Aucun"}
            </p>
            <p>
              <span className="text-muted-foreground">Contributeur destination :</span>{" "}
              {preview.destination_contributor ? `${preview.destination_contributor.display_name ?? "—"} (${preview.destination_contributor.role})` : "Sera créé"}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <Stat label="Faits" value={preview.facts.length} />
            <Stat label="Public contrib." value={preview.public_contributions.length} />
            <Stat label="Raw contrib." value={preview.raw_contributions.length} />
            <Stat label="Legacy contrib." value={preview.vin_contributions.length} />
            <Stat label="Vérifications" value={preview.owner_verifications.length} />
          </div>

          {preview.public_contributions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Contributions publiques</h3>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {preview.public_contributions.map((c: any) => (
                  <li key={c.id}>
                    [{c.contribution_type}] {c.title?.slice(0, 100)} — {c.status}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.facts.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Faits</h3>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {preview.facts.map((f: any) => (
                  <li key={f.id}>{f.content?.slice(0, 120)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
