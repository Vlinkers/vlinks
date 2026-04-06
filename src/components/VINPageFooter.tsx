import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Plus, UserPlus, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SimilarDossier {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  contributions_count: number | null;
}

interface VINPageFooterProps {
  make: string | null | undefined;
  model: string | null | undefined;
  currentVin: string;
  onContribute: () => void;
}

export function VINPageFooter({ make, model, currentVin, onContribute }: VINPageFooterProps) {
  const { user } = useAuth();
  const [similar, setSimilar] = useState<SimilarDossier[]>([]);

  useEffect(() => {
    if (!make) return;
    const fetchSimilar = async () => {
      let query = supabase
        .from("vins")
        .select("id, vin, make, model, year, contributions_count")
        .eq("make", make)
        .neq("vin", currentVin)
        .gt("contributions_count", 0)
        .order("contributions_count", { ascending: false })
        .limit(3);
      if (model) query = query.eq("model", model);
      const { data } = await query;
      if (data && data.length > 0) {
        setSimilar(data);
      } else if (model) {
        // Fallback: same make, any model
        const { data: fallback } = await supabase
          .from("vins")
          .select("id, vin, make, model, year, contributions_count")
          .eq("make", make)
          .neq("vin", currentVin)
          .gt("contributions_count", 0)
          .order("contributions_count", { ascending: false })
          .limit(3);
        setSimilar(fallback || []);
      }
    };
    fetchSimilar();
  }, [make, model, currentVin]);

  return (
    <section className="bg-[#F8FAFC] border-t border-border">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* CTA */}
        <div className="text-center mb-8">
          {user ? (
            <>
              <p className="text-base font-semibold text-foreground mb-1">
                Vous avez visité ce véhicule ?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Vos observations peuvent aider le prochain acheteur.
              </p>
              <Button onClick={onContribute}>
                <Plus className="w-4 h-4 mr-1.5" />
                Contribuer au dossier
              </Button>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-foreground mb-1">
                Vous avez des informations sur ce véhicule ?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Créez un compte gratuit et contribuez.
              </p>
              <Button asChild>
                <Link to="/auth">
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Rejoindre VLINKS
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Similar dossiers */}
        {similar.length > 0 && (
          <div className="rounded-xl bg-card border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Dossiers similaires</h3>
            <div className="grid gap-2">
              {similar.map(s => (
                <Link
                  key={s.id}
                  to={`/vin/${s.vin}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {[s.year, s.make, s.model].filter(Boolean).join(" ") || s.vin}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      {s.vin.slice(0, 11)}…
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {s.contributions_count} contribution{(s.contributions_count || 0) > 1 ? "s" : ""}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
