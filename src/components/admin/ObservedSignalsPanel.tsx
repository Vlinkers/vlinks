import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Check, X, AlertTriangle, Loader2 } from "lucide-react";

interface Signal {
  id: string;
  signal_text: string;
  linked: boolean; // whether this signal is linked to the current contribution
}

interface ObservedSignalsPanelProps {
  vinId: string;
  contributionId: string;
}

export function ObservedSignalsPanel({ vinId, contributionId }: ObservedSignalsPanelProps) {
  const { toast } = useToast();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSignal, setNewSignal] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchSignals = async () => {
    // Fetch all signals for this VIN
    const { data: allSignals } = await supabase
      .from("observed_signals")
      .select("id, signal_text")
      .eq("vin_id", vinId)
      .order("created_at", { ascending: true });

    // Fetch signal_contributions linked to this contribution
    const { data: linkedRows } = await (supabase
      .from("signal_contributions" as any)
      .select("signal_id")
      .eq("contribution_id", contributionId) as any);

    const linkedIds = new Set((linkedRows as any[] || []).map((r: any) => r.signal_id));

    setSignals(
      (allSignals || []).map((s) => ({
        id: s.id,
        signal_text: s.signal_text,
        linked: linkedIds.has(s.id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchSignals(); }, [contributionId, vinId]);

  const addSignal = async () => {
    if (!newSignal.trim()) return;
    setAdding(true);
    const { data: userData } = await supabase.auth.getUser();
    const signalText = newSignal.trim();

    // Try to find existing signal for this VIN with same text
    const { data: existing } = await supabase
      .from("observed_signals")
      .select("id")
      .eq("vin_id", vinId)
      .eq("signal_text", signalText)
      .maybeSingle();

    let signalId: string;

    if (existing) {
      signalId = existing.id;
    } else {
      // Create new signal
      const { data: created, error } = await (supabase
        .from("observed_signals")
        .insert({
          vin_id: vinId,
          signal_text: signalText,
          created_by: userData.user?.id,
          first_observed_at: new Date().toISOString(),
          last_observed_at: new Date().toISOString(),
        } as any)
        .select("id")
        .single() as any);

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setAdding(false);
        return;
      }
      signalId = (created as any).id;
    }

    // Link to contribution
    const { error: linkError } = await (supabase
      .from("signal_contributions" as any)
      .insert({
        signal_id: signalId,
        contribution_id: contributionId,
      }) as any);

    if (linkError && !linkError.message?.includes("duplicate")) {
      toast({ title: "Erreur", description: linkError.message, variant: "destructive" });
    } else {
      // Update dates on the signal
      await updateSignalDates(signalId);
      setNewSignal("");
      fetchSignals();
      toast({ title: "Signal ajouté et lié" });
    }
    setAdding(false);
  };

  const updateSignalDates = async (signalId: string) => {
    // Get all contributions linked to this signal to compute first/last dates
    const { data: links } = await (supabase
      .from("signal_contributions" as any)
      .select("contribution_id")
      .eq("signal_id", signalId) as any);

    if (!links || (links as any[]).length === 0) return;

    const contribIds = (links as any[]).map((l: any) => l.contribution_id);
    const { data: contribs } = await supabase
      .from("public_contributions")
      .select("created_at")
      .in("id", contribIds)
      .order("created_at", { ascending: true });

    if (contribs && contribs.length > 0) {
      await (supabase
        .from("observed_signals")
        .update({
          first_observed_at: contribs[0].created_at,
          last_observed_at: contribs[contribs.length - 1].created_at,
        } as any)
        .eq("id", signalId) as any);
    }
  };

  const toggleLink = async (signalId: string, currentlyLinked: boolean) => {
    if (currentlyLinked) {
      // Unlink
      await (supabase
        .from("signal_contributions" as any)
        .delete()
        .eq("signal_id", signalId)
        .eq("contribution_id", contributionId) as any);
      await updateSignalDates(signalId);
      toast({ title: "Signal délié" });
    } else {
      // Link
      await (supabase
        .from("signal_contributions" as any)
        .insert({ signal_id: signalId, contribution_id: contributionId }) as any);
      await updateSignalDates(signalId);
      toast({ title: "Signal lié" });
    }
    fetchSignals();
  };

  const updateSignal = async (id: string) => {
    if (!editText.trim()) return;
    const { error } = await (supabase
      .from("observed_signals")
      .update({ signal_text: editText.trim(), updated_at: new Date().toISOString() } as any)
      .eq("id", id) as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setEditingId(null);
      fetchSignals();
      toast({ title: "Signal modifié" });
    }
  };

  const deleteSignal = async (id: string) => {
    const { error } = await (supabase.from("observed_signals") as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      fetchSignals();
      toast({ title: "Signal supprimé" });
    }
  };

  // Split into linked and unlinked signals
  const linkedSignals = signals.filter((s) => s.linked);
  const unlinkedSignals = signals.filter((s) => !s.linked);

  return (
    <div className="border border-warning/30 rounded-xl p-4 space-y-3 bg-warning/5">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-warning">
        <AlertTriangle className="w-4 h-4" />
        Signaux observés à extraire
      </h3>
      <p className="text-xs text-muted-foreground">
        Identifiez les faits observables. Si un signal existe déjà pour ce VIN, cochez-le pour le lier à cette contribution.
      </p>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Linked signals */}
          {linkedSignals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground/70">Liés à cette contribution :</p>
              {linkedSignals.map((s) => (
                <SignalRow
                  key={s.id}
                  signal={s}
                  editingId={editingId}
                  editText={editText}
                  onEditTextChange={setEditText}
                  onStartEdit={(id, text) => { setEditingId(id); setEditText(text); }}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={updateSignal}
                  onDelete={deleteSignal}
                  onToggleLink={toggleLink}
                />
              ))}
            </div>
          )}

          {/* Existing unlinked signals for this VIN */}
          {unlinkedSignals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground/70">Autres signaux existants pour ce VIN :</p>
              {unlinkedSignals.map((s) => (
                <SignalRow
                  key={s.id}
                  signal={s}
                  editingId={editingId}
                  editText={editText}
                  onEditTextChange={setEditText}
                  onStartEdit={(id, text) => { setEditingId(id); setEditText(text); }}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={updateSignal}
                  onDelete={deleteSignal}
                  onToggleLink={toggleLink}
                />
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Jantes abîmées, Bruit moteur..."
              value={newSignal}
              onChange={(e) => setNewSignal(e.target.value)}
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => e.key === "Enter" && addSignal()}
            />
            <Button size="sm" onClick={addSignal} disabled={adding || !newSignal.trim()} className="h-8">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="ml-1">Ajouter</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SignalRow({
  signal,
  editingId,
  editText,
  onEditTextChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onToggleLink,
}: {
  signal: Signal;
  editingId: string | null;
  editText: string;
  onEditTextChange: (v: string) => void;
  onStartEdit: (id: string, text: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleLink: (id: string, linked: boolean) => void;
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${signal.linked ? "bg-warning/10 border-warning/30" : "bg-muted/30 border-border/30"}`}>
      {editingId === signal.id ? (
        <>
          <Input
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && onSaveEdit(signal.id)}
            autoFocus
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onSaveEdit(signal.id)}>
            <Check className="w-3.5 h-3.5 text-success" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancelEdit}>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </>
      ) : (
        <>
          <button
            onClick={() => onToggleLink(signal.id, signal.linked)}
            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
              signal.linked ? "bg-warning border-warning text-warning-foreground" : "border-muted-foreground/50 hover:border-warning"
            }`}
          >
            {signal.linked && <Check className="w-3 h-3" />}
          </button>
          <span className="text-sm flex-1">{signal.signal_text}</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onStartEdit(signal.id, signal.signal_text)}>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onDelete(signal.id)}>
            <Trash2 className="w-3.5 h-3.5 text-danger" />
          </Button>
        </>
      )}
    </div>
  );
}
