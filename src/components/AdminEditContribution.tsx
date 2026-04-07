import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sanitizeSelectValue, desanitizeSelectValue } from "@/lib/sanitizeSelectValue";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2, X, File, Camera, ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import type { PublicContribution, ContributionType } from "@/hooks/useVINData";

const CONTRIBUTION_TYPES: { value: ContributionType; label: string }[] = [
  { value: "inspection_report", label: "Rapport d'inspection" },
  { value: "vehicle_history", label: "Historique véhicule" },
  { value: "owner_exchange", label: "Échange avec vendeur" },
  { value: "mechanic_conversation", label: "Avis mécanicien" },
  { value: "photo_evidence", label: "Photos" },
  { value: "observation", label: "Observation" },
  { value: "purchase_decision", label: "Décision d'achat" },
  { value: "ownership_change", label: "Changement de propriétaire" },
  { value: "for_sale", label: "Mise en vente" },
  { value: "price_change", label: "Modification de prix" },
];

const PROVINCES = ["Alberta","Colombie-Britannique","Manitoba","Nouveau-Brunswick","Terre-Neuve-et-Labrador","Nouvelle-Écosse","Ontario","Île-du-Prince-Édouard","Québec","Saskatchewan","Territoires du Nord-Ouest","Nunavut","Yukon"];

const HOLDER_TYPES = [
  { value: "particulier", label: "Particulier" },
  { value: "concessionnaire", label: "Concessionnaire" },
  { value: "depot_vente", label: "Dépôt-vente" },
];

interface Props {
  contribution: PublicContribution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  logAction: (actionType: string, targetType: string, targetId: string, details?: Record<string, unknown>) => Promise<void>;
}

export function AdminEditContribution({ contribution, open, onOpenChange, onSaved, logAction }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<ContributionType>("observation");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [interventionDate, setInterventionDate] = useState("");
  const [mileage, setMileage] = useState("");
  const [province, setProvince] = useState("");
  const [holderType, setHolderType] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [listingUrl, setListingUrl] = useState("");

  // Photos & docs
  const [photos, setPhotos] = useState<{ id: string; fileName: string; url: string }[]>([]);
  const [documents, setDocuments] = useState<{ id: string; fileName: string }[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [deletedDocIds, setDeletedDocIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !contribution) {
      setLoadError(null);
      return;
    }

    try {
      setType(contribution.type ?? "observation");
      setTitle(contribution.title ?? "");
      setSummary(contribution.summaryPublic ?? "");
      setDetails(contribution.details ?? "");
      setInterventionDate(contribution.interventionDate ?? "");
      setMileage(contribution.mileageAtIntervention?.toString() ?? "");
      setProvince(contribution.province ?? "");
      setHolderType(contribution.holderType ?? "");
      setDealerName(contribution.dealerName ?? "");
      setAskingPrice(contribution.askingPrice?.toString() ?? "");
      setOldPrice(contribution.oldPrice?.toString() ?? "");
      setListingUrl(contribution.listingUrl ?? "");
      setPhotos(
        (contribution.photos ?? []).map(p => ({
          id: p?.id ?? "",
          fileName: p?.fileName ?? "photo",
          url: p?.url ?? "",
        }))
      );
      setDocuments(
        (contribution.documents ?? []).map(d => ({
          id: d?.id ?? "",
          fileName: d?.fileName ?? "document",
        }))
      );
      setDeletedPhotoIds([]);
      setDeletedDocIds([]);
      setLoadError(null);
    } catch (err: any) {
      console.error("AdminEditContribution init error:", err);
      setLoadError(err?.message || "Erreur lors du chargement de la contribution.");
    }
  }, [contribution, open]);

  // Close sheet on browser back
  useEffect(() => {
    if (!open) return;
    const handlePopState = () => {
      onOpenChange(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [open, onOpenChange]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!contribution) return;
    setSaving(true);
    try {
      const { error } = await (supabase.from("public_contributions").update({
        contribution_type: type,
        title: title || null,
        summary: summary || null,
        details: details || null,
        intervention_date: interventionDate || null,
        mileage_at_intervention: mileage ? parseInt(mileage) : null,
        province: province || null,
        holder_type: holderType || null,
        dealer_name: dealerName || null,
        asking_price: askingPrice ? parseInt(askingPrice) : null,
        old_price: oldPrice ? parseInt(oldPrice) : null,
        listing_url: listingUrl || null,
      } as any).eq("id", contribution.id) as any);

      if (error) throw error;

      for (const photoId of deletedPhotoIds) {
        await supabase.from("contribution_photos").delete().eq("id", photoId);
      }
      for (const docId of deletedDocIds) {
        await supabase.from("contribution_documents").delete().eq("id", docId);
      }

      await logAction("contribution_edited", "contribution", contribution.id, {
        fields_changed: { type, title, summary, details, interventionDate, mileage, province, holderType, dealerName, askingPrice, oldPrice, listingUrl },
        photos_deleted: deletedPhotoIds.length,
        docs_deleted: deletedDocIds.length,
      });

      toast({ title: "Contribution modifiée ✓" });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      console.error("AdminEditContribution save error:", e);
      toast({ title: "Erreur", description: e?.message || "Impossible d'enregistrer.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = (id: string) => {
    setDeletedPhotoIds(prev => [...prev, id]);
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const removeDoc = (id: string) => {
    setDeletedDocIds(prev => [...prev, id]);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const showSaleFields = type === "for_sale" || type === "price_change" || type === "ownership_change";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-5 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <SheetTitle className="text-base font-display font-bold text-foreground">
                Modifier la contribution
              </SheetTitle>
              {contribution && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: {contribution.id.slice(0, 8)}… · {contribution.author ?? "Inconnu"}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Error state */}
        {loadError && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
            <AlertTriangle className="w-10 h-10 text-warning" />
            <p className="text-sm text-foreground font-medium">Impossible de charger cette contribution.</p>
            <p className="text-xs text-muted-foreground">{loadError}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Retour
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setLoadError(null);
                // Re-trigger load
                if (contribution) {
                  setType(contribution.type ?? "observation");
                  setSummary(contribution.summaryPublic ?? "");
                }
              }}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Réessayer
              </Button>
            </div>
          </div>
        )}

        {/* No contribution state */}
        {!contribution && !loadError && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chargement de la contribution…</p>
          </div>
        )}

        {/* Form body */}
        {contribution && !loadError && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <FieldGroup label="Type de contribution">
                <Select value={type} onValueChange={(v) => setType(v as ContributionType)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRIBUTION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Date d'intervention">
                  <Input type="date" value={interventionDate} onChange={e => setInterventionDate(e.target.value)} className="bg-background" />
                </FieldGroup>
                <FieldGroup label="Kilométrage">
                  <Input inputMode="numeric" value={mileage} onChange={e => setMileage(e.target.value.replace(/\D/g, ""))} placeholder="km" className="bg-background" />
                </FieldGroup>
              </div>

              <FieldGroup label="Province">
                <Select value={sanitizeSelectValue(province)} onValueChange={(v) => setProvince(desanitizeSelectValue(v) ?? "")}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucune —</SelectItem>
                    {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <FieldGroup label="Titre">
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de la contribution" className="bg-background" />
              </FieldGroup>

              <FieldGroup label="Résumé / contenu principal">
                <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} className="bg-background resize-none" />
              </FieldGroup>

              <FieldGroup label="Détails complémentaires">
                <Textarea value={details} onChange={e => setDetails(e.target.value)} rows={4} className="bg-background resize-none" />
              </FieldGroup>

              {showSaleFields && (
                <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Champs spécifiques</p>
                  <FieldGroup label="Type de vendeur">
                    <Select value={sanitizeSelectValue(holderType)} onValueChange={(v) => setHolderType(desanitizeSelectValue(v) ?? "")}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Aucun —</SelectItem>
                        {HOLDER_TYPES.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                  {holderType === "concessionnaire" && (
                    <FieldGroup label="Nom du concessionnaire">
                      <Input value={dealerName} onChange={e => setDealerName(e.target.value)} className="bg-background" />
                    </FieldGroup>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label="Prix demandé ($)">
                      <Input inputMode="numeric" value={askingPrice} onChange={e => setAskingPrice(e.target.value.replace(/\D/g, ""))} className="bg-background" />
                    </FieldGroup>
                    <FieldGroup label="Ancien prix ($)">
                      <Input inputMode="numeric" value={oldPrice} onChange={e => setOldPrice(e.target.value.replace(/\D/g, ""))} className="bg-background" />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="URL de l'annonce">
                    <Input type="url" value={listingUrl} onChange={e => setListingUrl(e.target.value)} placeholder="https://..." className="bg-background" />
                  </FieldGroup>
                </div>
              )}

              {/* Photos */}
              {photos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Photos ({photos.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map(p => (
                      <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                        <img
                          src={p.url.startsWith("http") ? p.url : supabase.storage.from("vin-photos").getPublicUrl(p.url).data.publicUrl}
                          alt={p.fileName}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <button
                          onClick={() => removePhoto(p.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <File className="w-3.5 h-3.5" /> Documents ({documents.length})
                  </p>
                  <div className="space-y-1.5">
                    {documents.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-background">
                        <File className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground truncate flex-1">{d.fileName}</span>
                        <button onClick={() => removeDoc(d.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border bg-muted/30 flex-shrink-0 flex items-center justify-between">
              <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving} className="shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                Enregistrer
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
