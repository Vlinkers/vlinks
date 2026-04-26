import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EventWithFacts } from "@/hooks/useVinDossier";

const EVENT_TYPES = [
  "purchase","sale","accident","repair","maintenance","inspection","modification",
  "recall","insurance_claim","listing","import_export","registration","mileage_record","other",
] as const;

const EVENT_TYPE_LABELS: Record<string, string> = {
  purchase: "Achat", sale: "Vente", accident: "Accident", repair: "Réparation",
  maintenance: "Entretien", inspection: "Inspection", modification: "Modification",
  recall: "Rappel", insurance_claim: "Réclamation", listing: "Mise en vente",
  import_export: "Import/Export", registration: "Immatriculation",
  mileage_record: "Relevé km", other: "Autre",
};

interface Props {
  ewf: EventWithFacts | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vinId: string;
}

export function AdminContributionEditDialog({ ewf, open, onOpenChange, vinId }: Props) {
  const { isAdmin, logAction } = useAdmin();
  const qc = useQueryClient();
  const primaryFact = ewf?.facts.find((f) => f.fact.content?.trim()) ?? ewf?.facts[0] ?? null;

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<string>("other");
  const [eventDate, setEventDate] = useState<string>("");
  const [mileage, setMileage] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [moderationStatus, setModerationStatus] = useState<string>("approved");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ewf) return;
    setTitle(ewf.event.title ?? "");
    setEventType(ewf.event.event_type as string);
    setEventDate(ewf.event.event_date ?? "");
    setMileage(ewf.event.mileage_at_event != null ? String(ewf.event.mileage_at_event) : "");
    setContent(primaryFact?.fact.content ?? "");
    setModerationStatus((primaryFact?.fact.moderation_status as string) ?? "approved");
  }, [ewf, primaryFact]);

  if (!isAdmin || !ewf) return null;

  async function handleSave() {
    if (!ewf) return;
    setSaving(true);
    try {
      const eventPatch: Record<string, unknown> = {
        title: title.trim() || ewf.event.title,
        event_type: eventType,
        event_date: eventDate || null,
        mileage_at_event: mileage ? parseInt(mileage, 10) : null,
      };
      const { error: evErr } = await supabase.from("events").update(eventPatch as any).eq("id", ewf.event.id);
      if (evErr) throw evErr;

      if (primaryFact) {
        const { error: fErr } = await supabase
          .from("facts")
          .update({ content, moderation_status: moderationStatus as any })
          .eq("id", primaryFact.fact.id);
        if (fErr) throw fErr;
      }

      await logAction("edit_contribution", "event", ewf.event.id, {
        vin_id: vinId,
        changes: { title: eventPatch.title, event_type: eventType, event_date: eventDate, mileage, content_changed: content !== (primaryFact?.fact.content ?? ""), moderation_status: moderationStatus },
      });

      await qc.invalidateQueries({ queryKey: ["vin-dossier", vinId] });
      toast({ title: "Contribution mise à jour" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message ?? "Échec de la mise à jour", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!ewf) return;
    if (!confirm("Supprimer définitivement cette contribution (événement et faits associés) ?")) return;
    setSaving(true);
    try {
      // Delete facts first (then event)
      for (const fw of ewf.facts) {
        await supabase.from("facts").delete().eq("id", fw.fact.id);
      }
      const { error } = await supabase.from("events").delete().eq("id", ewf.event.id);
      if (error) throw error;
      await logAction("delete_contribution", "event", ewf.event.id, { vin_id: vinId });
      await qc.invalidateQueries({ queryKey: ["vin-dossier", vinId] });
      toast({ title: "Contribution supprimée" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message ?? "Échec de la suppression", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier la contribution (admin)</DialogTitle>
          <DialogDescription>Édition directe de l'événement et du fait principal.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kilométrage</Label>
              <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
            </div>
            <div>
              <Label>Statut de modération</Label>
              <Select value={moderationStatus} onValueChange={setModerationStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approuvé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                  <SelectItem value="flagged">Signalé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Contenu (fait principal)</Label>
            <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between gap-2">
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>Supprimer</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Sauvegarde…" : "Sauvegarder"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
