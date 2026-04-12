import { ReactNode } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import {
  LayoutDashboard,
  FileText,
  Car,
  Users,
  ClipboardList,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import vlinksFull from "@/assets/vlinks-full-logo.png";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/contributions", icon: FileText, label: "Faits" },
  { to: "/admin/events", icon: Calendar, label: "Événements" },
  { to: "/admin/red-flags", icon: AlertTriangle, label: "Red Flags" },
  { to: "/admin/vins", icon: Car, label: "VINs" },
  { to: "/admin/users", icon: Users, label: "Utilisateurs" },
  { to: "/admin/audit", icon: ClipboardList, label: "Journal" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAdmin();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <img src={vlinksFull} alt="VLINKS" className="h-7 mb-2" />
          <p className="text-xs text-muted-foreground font-medium">Administration</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
