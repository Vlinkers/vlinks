import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, X, ImageOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeaturedPhotoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vinId: string;
  vinCode: string;
  currentFeaturedUrl: string | null;
  onSaved: () => void;
}

export function FeaturedPhotoModal({ open, onOpenChange, vinId, vinCode, currentFeaturedUrl, onSaved }: FeaturedPhotoModalProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<{ id: string; url: string; caption: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentFeaturedUrl);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedUrl(currentFeaturedUrl);
    const fetchPhotos = async () => {
      setLoading(true);
      // Get all vin_contribution_ids for approved contributions of this VIN
      const { data: pcs } = await supabase
        .from("public_contributions")
        .select("vin_contribution_id")
        .eq("vin_id", vinId)
        .eq("status", "approved");

      const vcIds = (pcs || []).map((p) => p.vin_contribution_id).filter(Boolean) as string[];
      if (vcIds.length === 0) { setPhotos([]); setLoading(false); return; }

      const { data: photoRows } = await supabase
        .from("contribution_photos")
        .select("id, file_path, caption")
        .in("contribution_id", vcIds);

      const mapped = (photoRows || []).map((p) => {
        const { data: urlData } = supabase.storage.from("vin-photos").getPublicUrl(p.file_path);
        return { id: p.id, url: urlData.publicUrl, caption: p.caption };
      });
      setPhotos(mapped);
      setLoading(false);
    };
    fetchPhotos();
  }, [open, vinId, currentFeaturedUrl]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("vins").update({ featured_photo_url: selectedUrl } as any).eq("id", vinId);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: selectedUrl ? "Photo mise en avant définie" : "Photo mise en avant retirée" });
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Photo mise en avant — {vinCode}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <ImageOff className="w-8 h-8 mb-2" />
              <p className="text-sm">Aucune photo disponible pour ce VIN.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => {
                const isSelected = selectedUrl === photo.url;
                const isCurrent = currentFeaturedUrl === photo.url;
                return (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedUrl(isSelected ? null : photo.url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                    {isCurrent && !isSelected && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-muted/80 backdrop-blur rounded text-[10px] font-medium text-foreground">
                        Actuelle
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedUrl(null)}
            disabled={!selectedUrl}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" /> Retirer la photo
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || selectedUrl === currentFeaturedUrl}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirmer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
