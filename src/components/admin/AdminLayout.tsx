import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Flag,
  Menu,
  KeyRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import vlinksFull from "@/assets/vlinks-full-logo.png";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/contributions", icon: FileText, label: "Faits" },
  { to: "/admin/events", icon: Calendar, label: "Événements" },
  { to: "/admin/red-flags", icon: AlertTriangle, label: "Red Flags" },
  { to: "/admin/reports", icon: Flag, label: "Signalements", showBadge: true },
  { to: "/admin/owner-claims", icon: KeyRound, label: "Revendications", showClaimsBadge: true },
  { to: "/admin/vins", icon: Car, label: "VINs" },
  { to: "/admin/users", icon: Users, label: "Utilisateurs" },
  { to: "/admin/audit", icon: ClipboardList, label: "Journal" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAdmin();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const { data: pendingReportsCount = 0 } = useQuery({
    queryKey: ["admin-pending-reports-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: pendingClaimsCount = 0 } = useQuery({
    queryKey: ["admin-pending-owner-claims-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("owner_verifications")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

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

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-border">
        <img src={vlinksFull} alt="VLINKS" className="h-7 mb-2" />
        <p className="text-xs text-muted-foreground font-medium">Administration</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
              {"showBadge" in item && item.showBadge && pendingReportsCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-[10px] h-5 min-w-5 px-1.5">
                  {pendingReportsCount}
                </Badge>
              )}
              {"showClaimsBadge" in item && item.showClaimsBadge && pendingClaimsCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-[10px] h-5 min-w-5 px-1.5">
                  {pendingClaimsCount}
                </Badge>
              )}
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
    </>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/50 flex-col shrink-0">
        <NavContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border bg-background/95 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 flex flex-col">
              <NavContent />
            </SheetContent>
          </Sheet>
          <img src={vlinksFull} alt="VLINKS" className="h-6" />
          <span className="text-xs text-muted-foreground font-medium ml-auto">Admin</span>
        </header>

        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
