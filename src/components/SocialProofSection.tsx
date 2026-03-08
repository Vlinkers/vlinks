import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Car, FileCheck, Files } from "lucide-react";

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

  const metrics = [
    { icon: Car, value: stats.vins, label: "Dossiers véhicules" },
    { icon: FileCheck, value: stats.contributions, label: "Contributions approuvées" },
    { icon: Files, value: stats.documents, label: "Documents partagés" },
  ];

  return (
    <section className="py-12 border-t border-border">
      <div className="max-w-3xl mx-auto px-4 grid grid-cols-3 gap-6">
        {metrics.map((m, i) => (
          <div key={i} className="text-center p-4 rounded-lg bg-card border border-border shadow-card">
            <m.icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="font-display text-2xl font-bold text-foreground">
              {m.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SocialProofSection;
