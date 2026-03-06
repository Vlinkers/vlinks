import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Car, FileText, Users, Camera, Files } from "lucide-react";

interface DashboardStats {
  vins: number;
  contributions: number;
  users: number;
  documents: number;
  photos: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ vins: 0, contributions: 0, users: 0, documents: 0, photos: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [v, c, u, d, p] = await Promise.all([
        supabase.from("vins").select("id", { count: "exact", head: true }),
        supabase.from("public_contributions").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("contribution_documents").select("id", { count: "exact", head: true }),
        supabase.from("contribution_photos").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        vins: v.count ?? 0,
        contributions: c.count ?? 0,
        users: u.count ?? 0,
        documents: d.count ?? 0,
        photos: p.count ?? 0,
      });
    };
    fetch();
  }, []);

  const cards = [
    { label: "VINs", value: stats.vins, icon: Car, to: "/admin/vins", color: "text-primary" },
    { label: "Contributions", value: stats.contributions, icon: FileText, to: "/admin/contributions", color: "text-secondary" },
    { label: "Utilisateurs", value: stats.users, icon: Users, to: "/admin/users", color: "text-accent" },
    { label: "Documents", value: stats.documents, icon: Files, to: "/admin/contributions", color: "text-warning" },
    { label: "Photos", value: stats.photos, icon: Camera, to: "/admin/contributions", color: "text-success" },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="p-4 rounded-xl border border-border bg-card/50 hover:bg-muted/30 transition-colors"
          >
            <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
            <p className="font-display text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
