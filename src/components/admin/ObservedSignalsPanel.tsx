import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Check, X, AlertTriangle, Loader2 } from "lucide-react";

interface Signal {
  id: string;
  signal_text: string;
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
    const { data } = await supabase
      .from("observed_signals" as any)
      .select("id, signal_text")
      .eq("contribution_id", contributionId)
      .order("created_at", { ascending: true });
    setSignals((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSignals(); }, [contributionId]);

  const addSignal = async () => {
    if (!newSignal.trim()) return;
    setAdding(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase.from("observed_signals" as any) as any).insert({
      vin_id: vinId,
      contribution_id: contributionId,
      signal_text: newSignal.trim(),
      created_by: userData.user?.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewSignal("");
      fetchSignals();
      toast({ title: "Signal ajouté" });
    }
    setAdding(false);
  };

  const updateSignal = async (id: string) => {
    if (!editText.trim()) return;
    const { error } = await (supabase.from("observed_signals" as any) as any)
      .update({ signal_text: editText.trim(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setEditingId(null);
      fetchSignals();
      toast({ title: "Signal modifié" });
    }
  };

  const deleteSignal = async (id: string) => {
    const { error } = await (supabase.from("observed_signals" as any) as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      fetchSignals();
      toast({ title: "Signal supprimé" });
    }
  };

  return (
    <div className="border border-warning/30 rounded-xl p-4 space-y-3 bg-warning/5">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-warning">
        <AlertTriangle className="w-4 h-4" />
        Signaux observés à extraire
      </h3>
      <p className="text-xs text-muted-foreground">
        Identifiez les faits observables dans cette contribution pour les afficher sur la page VIN.
      </p>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {signals.length > 0 && (
            <div className="space-y-2">
              {signals.map((s) => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                  {editingId === s.id ? (
                    <>
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="h-8 text-sm flex-1"
                        onKeyDown={(e) => e.key === "Enter" && updateSignal(s.id)}
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateSignal(s.id)}>
                        <Check className="w-3.5 h-3.5 text-success" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm flex-1">{s.signal_text}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(s.id); setEditText(s.signal_text); }}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteSignal(s.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

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
