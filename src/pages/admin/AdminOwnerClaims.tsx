import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
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
  Loader2,
  ExternalLink,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface ClaimRow {
  id: string;
  user_id: string;
  vin_id: string;
  status: string;
  created_at: string;
  verified_at: string | null;
  revoked_at: string | null;
  // joined
  vin?: string;
  vin_make?: string | null;
  vin_model?: string | null;
  vin_year?: number | null;
  username?: string | null;
  display_name?: string | null;
  contributions_count?: number;
  document_path?: string | null;
  document_type?: string | null;
  verification_id?: string | null;
  verification_status?: string | null;
}

const documentTypeLabels: Record<string, string> = {
  facture: "Facture récente",
  assurance: "Certificat d'assurance",
  carte_grise: "Carte grise (masquée)",
  autre: "Autre document",
};

const statusBadge = (s: string) => {
  switch (s) {
    case "active":
      return <Badge className="bg-warning/20 text-warning border-warning/30">En attente</Badge>;
    case "verified":
      return <Badge className="bg-success/20 text-success border-success/30">Approuvée</Badge>;
    case "rejected":
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Rejetée</Badge>;
    case "revoked":
      return <Badge variant="outline">Révoquée</Badge>;
    default:
      return <Badge>{s}</Badge>;
  }
};

const verificationStatusLabel = (s?: string | null) => {
  switch (s) {
    case "pending":
      return "En attente";
    case "verified":
      return "Approuvée";
    case "rejected":
      return "Rejetée";
    default:
      return s || "—";
  }
};

export default function AdminOwnerClaims() {
  const { logAction } = useAdmin();
  const { toast } = useToast();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selected, setSelected] = useState<ClaimRow | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchClaims = useCallback(async () => {
    setLoading(true);

    // Pending count = active claims with a pending verification
    const { count: pc } = await supabase
      .from("owner_verifications")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending");
    setPendingCount(pc ?? 0);

    // Filter strategy: we drive the list from owner_verifications because the
    // approval flow lives there (verification_status). owner_claims tracks the
    // active ownership state.
    let verQuery = supabase
      .from("owner_verifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter === "pending") {
      verQuery = verQuery.eq("verification_status", "pending");
    } else if (statusFilter === "approved") {
      verQuery = verQuery.eq("verification_status", "verified");
    } else if (statusFilter === "rejected") {
      verQuery = verQuery.eq("verification_status", "rejected");
    }

    const { data: verifications, error: verError } = await verQuery;
    if (verError) {
      toast({ title: "Erreur", description: verError.message, variant: "destructive" });
      setClaims([]);
      setLoading(false);
      return;
    }
    if (!verifications || verifications.length === 0) {
      setClaims([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(verifications.map((v) => v.user_id))];
    const vinIds = [...new Set(verifications.map((v) => v.vin_id))];

    const [vinsRes, profilesRes, claimsRes] = await Promise.all([
      supabase.from("vins").select("id, vin, make, model, year").in("id", vinIds),
      supabase
        .from("profiles")
        .select("user_id, username, display_name, contributions_count")
        .in("user_id", userIds),
      supabase.from("owner_claims").select("*").in("vin_id", vinIds).in("user_id", userIds),
    ]);

    const vinMap = new Map((vinsRes.data || []).map((v) => [v.id, v]));
    const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
    const claimMap = new Map(
      (claimsRes.data || []).map((c) => [`${c.user_id}:${c.vin_id}`, c]),
    );

    const rows: ClaimRow[] = verifications.map((v) => {
      const vin = vinMap.get(v.vin_id);
      const profile = profileMap.get(v.user_id);
      const claim = claimMap.get(`${v.user_id}:${v.vin_id}`);
      return {
        id: claim?.id ?? v.id,
        user_id: v.user_id,
        vin_id: v.vin_id,
        status: claim?.status ?? "—",
        created_at: v.created_at,
        verified_at: claim?.verified_at ?? null,
        revoked_at: claim?.revoked_at ?? null,
        vin: vin?.vin,
        vin_make: vin?.make,
        vin_model: vin?.model,
        vin_year: vin?.year,
        username: profile?.username,
        display_name: profile?.display_name,
        contributions_count: profile?.contributions_count ?? 0,
        document_path: v.document_path,
        document_type: v.document_type,
        verification_id: v.id,
        verification_status: v.verification_status,
      };
    });

    setClaims(rows);
    setLoading(false);
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const openDetail = async (c: ClaimRow) => {
    setSelected(c);
    setDocPreviewUrl(null);
    if (!c.document_path) return;
    setDocLoading(true);
    const { data, error } = await supabase.storage
      .from("owner-verification-docs")
      .createSignedUrl(c.document_path, 60 * 10);
    if (error) {
      toast({
        title: "Aperçu indisponible",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDocPreviewUrl(data?.signedUrl ?? null);
    }
    setDocLoading(false);
  };

  const approveClaim = async (c: ClaimRow) => {
    if (!c.verification_id) return;
    setActionLoading(true);
    try {
      const { error: vErr } = await supabase
        .from("owner_verifications")
        .update({
          verification_status: "verified",
          verified_at: new Date().toISOString(),
        })
        .eq("id", c.verification_id);
      if (vErr) throw vErr;

      // Ensure an active owner_claims row exists
      const { data: existingClaim } = await supabase
        .from("owner_claims")
        .select("id, status")
        .eq("vin_id", c.vin_id)
        .eq("user_id", c.user_id)
        .maybeSingle();

      if (existingClaim) {
        if (existingClaim.status !== "active") {
          await supabase
            .from("owner_claims")
            .update({
              status: "active",
              verified_at: new Date().toISOString(),
              revoked_at: null,
            })
            .eq("id", existingClaim.id);
        } else {
          await supabase
            .from("owner_claims")
            .update({ verified_at: new Date().toISOString() })
            .eq("id", existingClaim.id);
        }
      } else {
        await supabase.from("owner_claims").insert({
          user_id: c.user_id,
          vin_id: c.vin_id,
          status: "active",
          verified_at: new Date().toISOString(),
        });
      }

      await logAction("owner_claim_approved", "owner_claim", c.id, {
        vin_id: c.vin_id,
        user_id: c.user_id,
      });
      toast({ title: "Revendication approuvée" });
      setSelected(null);
      fetchClaims();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const rejectClaim = async (c: ClaimRow) => {
    if (!c.verification_id) return;
    setActionLoading(true);
    try {
      const { error: vErr } = await supabase
        .from("owner_verifications")
        .update({
          verification_status: "rejected",
        })
        .eq("id", c.verification_id);
      if (vErr) throw vErr;

      // If a claim row exists, mark it revoked so the user can re-submit
      const { data: existingClaim } = await supabase
        .from("owner_claims")
        .select("id")
        .eq("vin_id", c.vin_id)
        .eq("user_id", c.user_id)
        .eq("status", "active")
        .maybeSingle();

      if (existingClaim) {
        await supabase
          .from("owner_claims")
          .update({ status: "revoked", revoked_at: new Date().toISOString() })
          .eq("id", existingClaim.id);
      }

      await logAction("owner_claim_rejected", "owner_claim", c.id, {
        vin_id: c.vin_id,
        user_id: c.user_id,
      });
      toast({ title: "Revendication rejetée" });
      setSelected(null);
      fetchClaims();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = claims.filter(
    (c) =>
      !search ||
      c.vin?.toLowerCase().includes(search.toLowerCase()) ||
      c.username?.toLowerCase().includes(search.toLowerCase()) ||
      c.display_name?.toLowerCase().includes(search.toLowerCase()),
  );

  const estimatedMinutes = Math.ceil(pendingCount * 1.5);

  const statusFilters = [
    { key: "pending", label: "En attente", count: pendingCount },
    { key: "approved", label: "Approuvées" },
    { key: "rejected", label: "Rejetées" },
    { key: "all", label: "Tout" },
  ];

  const isImageDoc = (path?: string | null) => {
    if (!path) return false;
    const lower = path.toLowerCase();
    return (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".gif")
    );
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Modération des revendications</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-warning mt-1">
              {pendingCount} revendication{pendingCount > 1 ? "s" : ""} en attente · ~{estimatedMinutes} min
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par VIN, pseudonyme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {statusFilters.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={statusFilter === s.key ? "default" : "outline"}
            onClick={() => setStatusFilter(s.key)}
          >
            {s.label}
            {s.count !== undefined && s.count > 0 && (
              <span className="ml-1.5 bg-warning text-warning-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {s.count}
              </span>
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
        <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">VIN</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Véhicule</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Demandeur</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Document</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-right px-3 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.verification_id ?? c.id}
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => openDetail(c)}
                >
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs">{c.vin?.slice(-6) || "—"}</span>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {[c.vin_year, c.vin_make, c.vin_model].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {c.username || c.display_name || "—"}
                    {typeof c.contributions_count === "number" && (
                      <span className="text-muted-foreground ml-1">
                        · {c.contributions_count} contrib.
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {documentTypeLabels[c.document_type ?? ""] || c.document_type || "—"}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">
                    {new Date(c.created_at).toLocaleDateString("fr-CA")}
                  </td>
                  <td className="px-3 py-3">
                    {statusBadge(
                      c.verification_status === "verified"
                        ? "verified"
                        : c.verification_status === "rejected"
                          ? "rejected"
                          : c.verification_status === "pending"
                            ? "active"
                            : c.status,
                    )}
                  </td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {c.verification_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => approveClaim(c)}
                            disabled={actionLoading}
                            aria-label="Approuver"
                          >
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => rejectClaim(c)}
                            disabled={actionLoading}
                            aria-label="Rejeter"
                          >
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    {statusFilter === "pending"
                      ? "Aucune revendication en attente 🎉"
                      : "Aucune revendication trouvée"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Détail de la revendication
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">VIN</p>
                  <p className="font-mono break-all">{selected.vin}</p>
                  {selected.vin && (
                    <Link
                      to={`/vin/${selected.vin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline"
                    >
                      Ouvrir le dossier <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Véhicule</p>
                  <p>
                    {[selected.vin_year, selected.vin_make, selected.vin_model]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Demandeur</p>
                  <p>{selected.username || selected.display_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.contributions_count ?? 0} contribution(s)
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type de document</p>
                  <p>
                    {documentTypeLabels[selected.document_type ?? ""] ||
                      selected.document_type ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Date de demande</p>
                  <p>{new Date(selected.created_at).toLocaleString("fr-CA")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Statut</p>
                  <div className="flex items-center gap-2">
                    {statusBadge(
                      selected.verification_status === "verified"
                        ? "verified"
                        : selected.verification_status === "rejected"
                          ? "rejected"
                          : selected.verification_status === "pending"
                            ? "active"
                            : selected.status,
                    )}
                    <span className="text-xs text-muted-foreground">
                      ({verificationStatusLabel(selected.verification_status)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Document preview */}
              <div className="border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Preuve de propriété
                </h3>
                {docLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : docPreviewUrl ? (
                  isImageDoc(selected.document_path) ? (
                    <img
                      src={docPreviewUrl}
                      alt="Preuve de propriété"
                      className="max-h-[60vh] w-full object-contain rounded-lg border border-border bg-muted/20"
                    />
                  ) : (
                    <div className="space-y-2">
                      <iframe
                        src={docPreviewUrl}
                        title="Preuve de propriété"
                        className="w-full h-[60vh] rounded-lg border border-border bg-muted/20"
                      />
                      <a
                        href={docPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        Ouvrir dans un nouvel onglet <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun document disponible.</p>
                )}
              </div>

              {selected.verification_status === "pending" && (
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    variant="destructive"
                    onClick={() => rejectClaim(selected)}
                    disabled={actionLoading}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Rejeter
                  </Button>
                  <Button onClick={() => approveClaim(selected)} disabled={actionLoading}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Approuver
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
