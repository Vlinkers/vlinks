import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Car, FileCheck, Files } from "lucide-react";

// ── Configurable thresholds ──
// Below these values, numeric counts are hidden and replaced by qualitative messages.
const THRESHOLDS = {
  vins: 50,
  contributions: 100,
  documents: 50,
};

const EARLY_MESSAGES = {
  vins: "Les premiers dossiers sont en ligne",
  contributions: "La communauté commence à contribuer",
  documents: "Des documents commencent à être partagés",
};

interface Stats {
  vins: number;
  contributions: number;
  documents: number;
}

const SocialProofSection = () => {
  const [stats, setStats] = useState<Stats>({ vins: 0, contributions: 0, documents: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [vinsRes, contribRes, docsRes] = await Promise.all([
        supabase.from("vins").select("id", { count: "exact", head: true }),
        (supabase.from("public_contributions").select("id", { count: "exact", head: true }) as any).eq("status", "approved"),
        supabase.from("contribution_documents").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        vins: vinsRes.count ?? 0,
        contributions: contribRes.count ?? 0,
        documents: docsRes.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  const metrics: { icon: typeof Car; key: keyof Stats; label: string }[] = [
    { icon: Car, key: "vins", label: "Dossiers véhicules" },
    { icon: FileCheck, key: "contributions", label: "Contributions approuvées" },
    { icon: Files, key: "documents", label: "Documents partagés" },
  ];

  return (
    <section className="py-12 border-t border-border">
      <div className="max-w-3xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {metrics.map((m, i) => {
          const value = stats[m.key];
          const aboveThreshold = value >= THRESHOLDS[m.key];

          return (
            <div key={i} className="text-center p-4 rounded-lg bg-card border border-border shadow-card">
              <m.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              {aboveThreshold ? (
                <>
                  <p className="font-display text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                </>
              ) : (
                <p className="text-sm font-medium text-foreground leading-snug mt-1">
                  {EARLY_MESSAGES[m.key]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SocialProofSection;
