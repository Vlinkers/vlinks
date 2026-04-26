// TEMPORARY ADMIN TOOL — remove after data cleanup
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

type ProfileOpt = { user_id: string; username: string | null; display_name: string | null };
type Row = {
  key: string;
  kind: "public_contribution" | "raw_contribution" | "vin_contribution" | "fact" | "owner_verification";
  id: string;
  date: string | null;
  type: string;
  content: string;
  attachments: number;
};

export default function AdminTools() {
  const { user } = useAuth();
  const [vin, setVin] = useState("WP1AD2A20DLA79693");
  const [vinId, setVinId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileOpt[]>([]);
  const [sourceId, setSourceId] = useState<string>("");
  const [destId, setDestId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Load all profiles into the dropdowns
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .order("username", { ascending: true });
      if (error) {
        toast.error(`Profils: ${error.message}`);
        return;
      }
      setProfiles((data ?? []) as ProfileOpt[]);
      // Pre-select FirstVlinker / thirdvlinker if present
      const find = (u: string) => data?.find((p: any) => (p.username ?? "").toLowerCase() === u.toLowerCase());
      const src = find("thirdvlinker");
      const dst = find("FirstVlinker");
      if (src) setSourceId(src.user_id);
      if (dst) setDestId(dst.user_id);
    })();
  }, []);

  // Resolve VIN id and load contributions whenever VIN or source changes
  useEffect(() => {
    setRows([]);
    setSelected(new Set());
    setVinId(null);
    if (!vin.trim() || !sourceId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: v, error: vErr } = await supabase
          .from("vins")
          .select("id, vin")
          .eq("vin", vin.trim().toUpperCase())
          .maybeSingle();
        if (vErr) throw new Error(`VIN: ${vErr.message}`);
        if (!v) throw new Error(`VIN introuvable: ${vin}`);
        if (cancelled) return;
        setVinId(v.id);

        // Inventory: parallel queries
        const [pub, raw, leg, ver, contributorRow] = await Promise.all([
          supabase.from("public_contributions").select("id, title, contribution_type, status, created_at").eq("vin_id", v.id).eq("user_id", sourceId),
          supabase.from("raw_contributions").select("id, title, contribution_type, created_at").eq("vin_id", v.id).eq("user_id", sourceId),
          supabase.from("vin_contributions").select("id, title, contribution_type, created_at").eq("vin_id", v.id).eq("user_id", sourceId),
          supabase.from("owner_verifications").select("id, verification_status, created_at").eq("vin_id", v.id).eq("user_id", sourceId),
          supabase.from("contributors").select("id").eq("vin_id", v.id).eq("user_id", sourceId).maybeSingle(),
        ]);
        if (pub.error) throw new Error(`public_contributions: ${pub.error.message}`);
        if (raw.error) throw new Error(`raw_contributions: ${raw.error.message}`);
        if (leg.error) throw new Error(`vin_contributions: ${leg.error.message}`);
        if (ver.error) throw new Error(`owner_verifications: ${ver.error.message}`);

        // Facts via contributor + events on this VIN
        let facts: any[] = [];
        if (contributorRow.data?.id) {
          const { data: f, error: fErr } = await supabase
            .from("facts")
            .select("id, content, created_at, event_id, events!inner(vin_id)")
            .eq("contributor_id", contributorRow.data.id)
            .eq("events.vin_id", v.id);
          if (fErr) throw new Error(`facts: ${fErr.message}`);
          facts = f ?? [];
        }

        if (cancelled) return;
        const out: Row[] = [
          ...(pub.data ?? []).map((r: any) => ({
            key: `pub:${r.id}`, kind: "public_contribution" as const, id: r.id,
            date: r.created_at, type: `Contribution publique (${r.contribution_type}) — ${r.status}`,
            content: r.title ?? "", attachments: 0,
          })),
          ...(raw.data ?? []).map((r: any) => ({
            key: `raw:${r.id}`, kind: "raw_contribution" as const, id: r.id,
            date: r.created_at, type: `Brouillon (${r.contribution_type})`,
            content: r.title ?? "", attachments: 0,
          })),
          ...(leg.data ?? []).map((r: any) => ({
            key: `leg:${r.id}`, kind: "vin_contribution" as const, id: r.id,
            date: r.created_at, type: `Legacy (${r.contribution_type})`,
            content: r.title ?? "", attachments: 0,
          })),
          ...facts.map((r: any) => ({
            key: `fact:${r.id}`, kind: "fact" as const, id: r.id,
            date: r.created_at, type: "Fait",
            content: (r.content ?? "").slice(0, 140), attachments: 0,
          })),
          ...(ver.data ?? []).map((r: any) => ({
            key: `ver:${r.id}`, kind: "owner_verification" as const, id: r.id,
            date: r.created_at, type: `Vérification propriétaire (${r.verification_status})`,
            content: "—", attachments: 0,
          })),
        ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

        setRows(out);
        setSelected(new Set(out.map((r) => r.key)));
      } catch (e: any) {
        if (!cancelled) toast.error(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vin, sourceId]);

  const toggle = (k: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };
  const allOn = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.key)));

  const profileLabel = (p: ProfileOpt) =>
    `${p.username ?? p.display_name ?? "(sans pseudo)"} — ${p.user_id.slice(0, 8)}`;

  const execute = async () => {
    if (!vinId || !sourceId || !destId) return toast.error("Sélection incomplète");
    if (sourceId === destId) return toast.error("Source et destination identiques");
    if (selected.size === 0) return toast.error("Aucune contribution sélectionnée");
    if (!confirm(`Confirmer la réattribution de ${selected.size} élément(s) ?`)) return;

    setExecuting(true);
    const counters: Record<string, number> = { pub: 0, raw: 0, leg: 0, fact: 0, ver: 0 };
    const errors: string[] = [];

    try {
      // Resolve / create destination contributor for facts
      let destContributorId: string | null = null;
      const needFacts = rows.some((r) => r.kind === "fact" && selected.has(r.key));
      if (needFacts) {
        const { data: existing } = await supabase
          .from("contributors")
          .select("id")
          .eq("vin_id", vinId)
          .eq("user_id", destId)
          .maybeSingle();
        if (existing?.id) {
          destContributorId = existing.id;
        } else {
          const { data: srcContrib } = await supabase
            .from("contributors")
            .select("role")
            .eq("vin_id", vinId)
            .eq("user_id", sourceId)
            .maybeSingle();
          const { data: prof } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("user_id", destId)
            .maybeSingle();
          const { data: created, error: cErr } = await supabase
            .from("contributors")
            .insert({
              vin_id: vinId,
              user_id: destId,
              role: (srcContrib?.role as any) ?? "buyer",
              display_name: prof?.username ?? prof?.display_name ?? null,
              is_anonymous: false,
            } as any)
            .select("id")
            .single();
          if (cErr) throw new Error(`Création contributeur destination: ${cErr.message}`);
          destContributorId = created.id;
        }
      }

      for (const r of rows) {
        if (!selected.has(r.key)) continue;
        try {
          if (r.kind === "public_contribution") {
            const { error } = await supabase.from("public_contributions").update({ user_id: destId }).eq("id", r.id);
            if (error) throw error;
            counters.pub++;
          } else if (r.kind === "raw_contribution") {
            const { error } = await supabase.from("raw_contributions").update({ user_id: destId }).eq("id", r.id);
            if (error) throw error;
            counters.raw++;
          } else if (r.kind === "vin_contribution") {
            const { error } = await supabase.from("vin_contributions").update({ user_id: destId }).eq("id", r.id);
            if (error) throw error;
            counters.leg++;
          } else if (r.kind === "fact" && destContributorId) {
            const { error } = await supabase.from("facts").update({ contributor_id: destContributorId }).eq("id", r.id);
            if (error) throw error;
            counters.fact++;
          } else if (r.kind === "owner_verification") {
            // Avoid unique (user_id, vin_id) collision: only move if dest has none yet
            const { data: dup } = await supabase
              .from("owner_verifications")
              .select("id")
              .eq("vin_id", vinId)
              .eq("user_id", destId)
              .maybeSingle();
            if (dup) {
              errors.push(`Vérification ${r.id.slice(0, 8)}: la destination en possède déjà une sur ce VIN`);
              continue;
            }
            const { error } = await supabase.from("owner_verifications").update({ user_id: destId }).eq("id", r.id);
            if (error) throw error;
            counters.ver++;
          }
        } catch (e: any) {
          errors.push(`${r.kind} ${r.id.slice(0, 8)}: ${e.message}`);
        }
      }

      // Audit log
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user!.id,
        action_type: "reassign_contributions",
        target_type: "vin",
        target_id: vinId,
        details: { vin, source_user_id: sourceId, destination_user_id: destId, counters, errors } as any,
      });

      const total = Object.values(counters).reduce((a, b) => a + b, 0);
      if (errors.length) {
        toast.warning(`Transféré ${total} élément(s). ${errors.length} erreur(s).`);
        console.warn("Réattribution erreurs:", errors);
      } else {
        toast.success(`Réattribution effectuée : ${total} élément(s) transféré(s).`);
      }
      // Refresh inventory
      setVinId(null);
      setTimeout(() => setVin((s) => s), 0);
      // Trigger reload
      const v = vin;
      setVin("");
      setTimeout(() => setVin(v), 50);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const sourceProfile = useMemo(() => profiles.find((p) => p.user_id === sourceId), [profiles, sourceId]);
  const destProfile = useMemo(() => profiles.find((p) => p.user_id === destId), [profiles, destId]);

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-2">Outils admin</h1>
      <p className="text-sm text-muted-foreground mb-6">⚠️ Outil temporaire. À retirer après le nettoyage des données de test.</p>

      <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 mb-6 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Réattribution sélective de contributions</p>
          <p className="text-muted-foreground">
            Choisissez le VIN, l'utilisateur source et destination, puis cochez les éléments à transférer. Les modifications sont effectuées directement sous votre rôle admin (RLS).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4 max-w-2xl">
        <div>
          <Label htmlFor="vin">VIN concerné</Label>
          <Input id="vin" value={vin} onChange={(e) => setVin(e.target.value)} placeholder="WP1AD2A20DLA79693" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Utilisateur source</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger><SelectValue placeholder="Choisir un utilisateur" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{profileLabel(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Utilisateur destination</Label>
            <Select value={destId} onValueChange={setDestId}>
              <SelectTrigger><SelectValue placeholder="Choisir un utilisateur" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{profileLabel(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-4xl rounded-xl border border-border bg-card/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">
            Contributions de {sourceProfile?.username ?? "—"} sur ce VIN
          </h2>
          {rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allOn ? "Tout désélectionner" : "Tout sélectionner"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !sourceId || !vin ? (
          <p className="text-sm text-muted-foreground">Sélectionnez un VIN et un utilisateur source pour voir les contributions.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune contribution trouvée pour cet utilisateur sur ce VIN.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <label key={r.key} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30">
                <Checkbox checked={selected.has(r.key)} onCheckedChange={() => toggle(r.key)} className="mt-1" />
                <div className="flex-1 text-sm min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</span>
                    <span>•</span>
                    <span>{r.type}</span>
                  </div>
                  <p className="truncate">{r.content || <span className="italic text-muted-foreground">(sans titre)</span>}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {selected.size} / {rows.length} sélectionné(s) • Vers : <strong>{destProfile?.username ?? "—"}</strong>
          </p>
          <Button variant="destructive" onClick={execute} disabled={executing || selected.size === 0 || !destId || sourceId === destId}>
            {executing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmer la réattribution
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
