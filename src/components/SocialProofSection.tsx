import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Car, FileCheck, Files } from "lucide-react";

interface Stats {
  vins: number;
  contributions: number;
  documents: number;
}

const SocialProofSection = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({ vins: 0, contributions: 0, documents: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [vinsRes, contribRes, docsRes] = await Promise.all([
        supabase.from("vins").select("id", { count: "exact", head: true }),
        supabase.from("public_contributions").select("id", { count: "exact", head: true }),
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
    { icon: Car, value: stats.vins, label: t("social.vins") },
    { icon: FileCheck, value: stats.contributions, label: t("social.contributions") },
    { icon: Files, value: stats.documents, label: t("social.documents") },
  ];

  return (
    <section className="py-16 border-t border-border/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8">
          {metrics.map((m, i) => (
            <div key={i} className="text-center">
              <m.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {m.value}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
