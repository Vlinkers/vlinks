import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const REPORT_TYPE_LABELS: Record<string, string> = {
  illegal_content: "Contenu illicite",
  defamation: "Diffamation",
  privacy_violation: "Vie privée",
  false_information: "Fausse info",
  harassment: "Harcèlement",
  copyright: "Droit d'auteur",
  other: "Autre",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "destructive" },
  under_review: { label: "En examen", variant: "default" },
  actioned: { label: "Traité", variant: "secondary" },
  dismissed: { label: "Rejeté", variant: "outline" },
};

const ACTION_OPTIONS = [
  { value: "content_removed", label: "Retirer le contenu" },
  { value: "content_hidden", label: "Masquer le contenu" },
  { value: "user_warned", label: "Avertir l'auteur" },
  { value: "user_suspended", label: "Suspendre l'auteur" },
  { value: "no_action", label: "Aucune action" },
];

export default function AdminContentReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState<{ id: string; action: string } | null>(null);
  const [adminResponse, setAdminResponse] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-content-reports", statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (typeFilter !== "all") query = query.eq("report_type", typeFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const processReport = useMutation({
    mutationFn: async ({
      reportId,
      action,
      status,
      response,
    }: {
      reportId: string;
      action: string;
      status: string;
      response: string;
    }) => {
      const { error } = await supabase
        .from("content_reports")
        .update({
          admin_action: action,
          status,
          admin_response: response || null,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content-reports"] });
      toast.success("Signalement traité.");
      setActionDialog(null);
      setAdminResponse("");
    },
    onError: () => toast.error("Erreur lors du traitement."),
  });

  const handleAction = (reportId: string, action: string) => {
    setActionDialog({ id: reportId, action });
  };

  const confirmAction = () => {
    if (!actionDialog) return;
    const status = actionDialog.action === "no_action" ? "dismissed" : "actioned";
    processReport.mutate({
      reportId: actionDialog.id,
      action: actionDialog.action,
      status,
      response: adminResponse,
    });
  };

  const handleDismiss = (reportId: string) => {
    processReport.mutate({
      reportId,
      action: "no_action",
      status: "dismissed",
      response: "",
    });
  };

  const handleMarkUnderReview = (reportId: string) => {
    supabase
      .from("content_reports")
      .update({ status: "under_review" })
      .eq("id", reportId)
      .then(() => queryClient.invalidateQueries({ queryKey: ["admin-content-reports"] }));
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Signalements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount} signalement{pendingCount !== 1 ? "s" : ""} en attente de traitement
          </p>
        </div>

        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="under_review">En examen</SelectItem>
              <SelectItem value="actioned">Traité</SelectItem>
              <SelectItem value="dismissed">Rejeté</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rapporteur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun signalement
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => {
                  const statusInfo = STATUS_LABELS[report.status] ?? STATUS_LABELS.pending;
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="text-sm">
                        {report.reporter_email ? (
                          <span className="text-muted-foreground">{report.reporter_email}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Utilisateur connecté</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {REPORT_TYPE_LABELS[report.report_type] ?? report.report_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {report.target_type} <br />
                        <span className="font-mono text-[10px]">{report.target_id.slice(0, 8)}…</span>
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">
                        {report.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="text-xs">
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(report.created_at), "d MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.status === "pending" || report.status === "under_review" ? (
                          <div className="flex items-center gap-1 justify-end">
                            {report.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleMarkUnderReview(report.id)}
                              >
                                Examiner
                              </Button>
                            )}
                            <Select onValueChange={(v) => handleAction(report.id, v)}>
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue placeholder="Action…" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground"
                              onClick={() => handleDismiss(report.id)}
                            >
                              Rejeter
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {report.admin_action === "content_removed"
                              ? "Contenu retiré"
                              : report.admin_action === "no_action"
                              ? "Aucune action"
                              : report.admin_action ?? "—"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!actionDialog} onOpenChange={(v) => !v && setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer l'action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Action sélectionnée :{" "}
              <strong>
                {ACTION_OPTIONS.find((o) => o.value === actionDialog?.action)?.label}
              </strong>
            </p>
            <div>
              <label className="text-sm font-medium mb-1 block">Réponse administrative (optionnel)</label>
              <Textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Raison de la décision…"
                maxLength={1000}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Annuler
              </Button>
              <Button onClick={confirmAction} disabled={processReport.isPending}>
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
