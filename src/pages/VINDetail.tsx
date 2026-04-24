import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ContributionGateway } from "@/components/contribution/ContributionGateway";
import { useContributor } from "@/hooks/useContributor";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { UsernameRequiredDialog } from "@/components/UsernameRequiredDialog";
import { PDFDownloadDialog } from "@/components/PDFDownloadDialog";
import { useVINData } from "@/hooks/useVINData";
import { useVINDecode } from "@/hooks/useVINDecode";
import { useVinDossier } from "@/hooks/useVinDossier";
import { EmptyVINPage } from "@/components/EmptyVINPage";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  AlertTriangle, Loader2, Copy, LayoutDashboard, MessageSquare, Camera,
  FileText, Gauge, Plus, FileDown, Share2, Shield, CheckCircle2, Clock,
} from "lucide-react";
import { DashboardView } from "@/components/vin/DashboardView";
import { ContributionsView } from "@/components/vin/ContributionsView";
import { PhotosView } from "@/components/vin/PhotosView";
import { DocumentsView } from "@/components/vin/DocumentsView";
import { MileageView } from "@/components/vin/MileageView";
import { OwnerView } from "@/components/vin/OwnerView";

// ─────────────────────────────────────────────────────────────────────────────
type WorkspaceView = "dashboard" | "owner" | "contributions" | "photos" | "documents" | "mileage" | "contribute";

const OWNER_ROLES = new Set(["owner_verified", "owner_unverified", "former_owner"]);

const NAV_ITEMS: { key: WorkspaceView; label: string; sidebarLabel?: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "contributions", label: "Contributions", icon: MessageSquare },
  { key: "photos", label: "Photos", icon: Camera },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "mileage", label: "Frise de vie", icon: Gauge },
  { key: "owner", label: "Dossier propriétaire", sidebarLabel: "Propriétaire", icon: Shield },
  { key: "contribute", label: "Contribuer", icon: Plus },
];

// ─────────────────────────────────────────────────────────────────────────────
const VINDetail = () => {
  const { vin } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { data, isLoading, error } = useVINData(vin);
  const { data: vinDecode } = useVINDecode(vin);
  const { data: dossier } = useVinDossier(data?.id);
  const { contributor } = useContributor(data?.id);

  const [activeView, setActiveView] = useState<WorkspaceView>("dashboard");
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userHasUsername, setUserHasUsername] = useState(true);
  const [hasMyPendingClaim, setHasMyPendingClaim] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCurrentUserId(null); setUserHasUsername(true); return; }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();
      setUserHasUsername(!!(profile?.username && profile.username.length >= 3));
    })();
  }, []);

  // Check if current user has a pending verification on this VIN (for sidebar badge)
  useEffect(() => {
    if (!currentUserId || !data?.id) { setHasMyPendingClaim(false); return; }
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("owner_verifications")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("vin_id", data.id)
        .eq("verification_status", "pending")
        .limit(1);
      if (!cancelled) setHasMyPendingClaim(!!rows && rows.length > 0);
    })();
    return () => { cancelled = true; };
  }, [currentUserId, data?.id]);

  const vehicleName = vinDecode?.is_valid
    ? [vinDecode.model_year, vinDecode.make, vinDecode.model, vinDecode.trim].filter(Boolean).join(" ")
    : data ? [data.year, data.make, data.model].filter(Boolean).join(" ") : "";

  const seoTitle = vehicleName ? `${vehicleName} · Dossier VIN` : `${vin} · Dossier VIN`;

  const vehicleSpecs = useMemo(() => {
    if (!vinDecode?.is_valid) return [];
    return [vinDecode.engine, vinDecode.body_class, vinDecode.fuel_type]
      .filter(Boolean)
      .join(" · ");
  }, [vinDecode]);

  const handleContributeClick = useCallback(() => {
    if (!currentUserId) { navigate(`/auth?redirect=/vin/${vin}`); return; }
    if (!userHasUsername) { setShowUsernameDialog(true); return; }
    setActiveView("contribute");
  }, [currentUserId, userHasUsername, navigate, vin]);

  const handleNavSelect = useCallback((key: WorkspaceView) => {
    if (key === "contribute") { handleContributeClick(); return; }
    setActiveView(key);
  }, [handleContributeClick]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: seoTitle, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    sonnerToast.success("Lien copié");
  }, [seoTitle]);

  const copyVin = useCallback(() => {
    if (!data?.vin) return;
    navigator.clipboard.writeText(data.vin);
    sonnerToast.success("VIN copié");
  }, [data?.vin]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="pt-20 pb-16">
          <div className="max-w-5xl mx-auto px-4 flex flex-col items-center justify-center min-h-[50vh]">
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Chargement du dossier...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="pt-20 pb-16">
          <div className="max-w-5xl mx-auto px-4 flex flex-col items-center justify-center min-h-[50vh]">
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm text-center">
              <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Erreur de chargement du dossier.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Empty ────────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <EmptyVINPage
        vin={vin || ""}
        vinDecode={vinDecode}
        currentUserId={currentUserId}
        handleContributeClick={handleContributeClick}
        showContributionForm={showContributionForm}
        setShowContributionForm={setShowContributionForm}
        showOwnerForm={showOwnerForm}
        setShowOwnerForm={setShowOwnerForm}
      />
    );
  }

  // ─── Workspace ────────────────────────────────────────────────────────────
  const activeLabel = NAV_ITEMS.find(i => i.key === activeView)?.label ?? "";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <SEO title={seoTitle} description={`Dossier VLINKS pour le VIN ${vin}`} />
      <Header />

      {/* Mobile: compact identity bar */}
      {isMobile && (
        <div className="bg-[#1A1A2E] text-white px-4 py-2.5 mt-16 sticky top-16 z-30 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs truncate">
            <span className="font-semibold truncate">{vehicleName || "Véhicule"}</span>
            <span className="text-white/40">·</span>
            <button
              onClick={copyVin}
              className="font-mono text-[hsl(152,69%,60%)] truncate hover:text-white transition-colors"
            >
              {data.vin}
            </button>
          </div>
        </div>
      )}

      <div className={cn("flex flex-1", isMobile ? "pb-14" : "pt-16")}>
        {/* ─── Desktop sidebar ───────────────────────────────────── */}
        {!isMobile && (
          <aside className="w-[250px] flex-shrink-0 bg-[#1A1A2E] text-white flex flex-col sticky top-16 self-start h-[calc(100vh-4rem)]">
            {/* Identity */}
            <div className="px-4 pt-3 pb-3 border-b border-white/10">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[hsl(152,69%,50%)] mb-1">
                Dossier véhicule
              </p>
              <h1 className="font-display text-sm font-bold leading-tight mb-1.5">
                {vehicleName || "Véhicule inconnu"}
              </h1>
              <button
                onClick={copyVin}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[hsl(152,69%,60%)] hover:text-white transition-colors group"
                title="Copier le VIN"
              >
                <span className="truncate">{data.vin}</span>
                <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 flex-shrink-0" />
              </button>
              {vehicleSpecs && (
                <p className="text-[11px] text-white/50 leading-snug mt-1">{vehicleSpecs}</p>
              )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-1.5 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.key;
                const showUnclaimed =
                  item.key === "owner" &&
                  !!dossier &&
                  !dossier.contributors.some((c) => OWNER_ROLES.has(c.role));
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavSelect(item.key)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all text-left border-l-2",
                      isActive
                        ? "bg-white/10 border-[hsl(152,69%,50%)] text-white font-medium"
                        : "border-transparent text-white/60 hover:bg-white/[0.06] hover:text-white/90"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.sidebarLabel ?? item.label}</span>
                    {showUnclaimed && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-medium tracking-wide flex-shrink-0">
                        Non revendiqué
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer actions */}
            <div className="p-2 border-t border-white/10 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPDFDialog(true)}
                className="w-full justify-start text-white/70 hover:text-white hover:bg-white/[0.06] h-7 text-xs"
              >
                <FileDown className="w-3.5 h-3.5 mr-2" />
                Rapport PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="w-full justify-start text-white/70 hover:text-white hover:bg-white/[0.06] h-7 text-xs"
              >
                <Share2 className="w-3.5 h-3.5 mr-2" />
                Partager
              </Button>
            </div>
          </aside>
        )}

        {/* ─── Central panel ─────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto p-4 md:p-6">
            <div key={activeView} className="animate-in fade-in duration-200">
              <WorkspacePanel
                view={activeView}
                label={activeLabel}
                dossier={dossier}
                onNavigate={handleNavSelect}
                vinId={data.id}
                vin={data.vin}
                contributor={contributor}
              />
            </div>
          </div>
        </main>
      </div>

      {/* ─── Mobile bottom nav ──────────────────────────────────── */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1A1A2E] border-t border-white/10 h-14 flex items-center justify-around px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavSelect(item.key)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  isActive ? "text-[hsl(152,69%,55%)]" : "text-white/50"
                )}
                aria-label={item.label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] leading-none truncate max-w-full px-1">
                  {item.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ─── Dialogs ────────────────────────────────────────────── */}
      {data && (
        <OwnerClaimForm
          vinId={data.id}
          vin={data.vin}
          open={showOwnerForm}
          onOpenChange={setShowOwnerForm}
          onSuccess={() => setShowOwnerForm(false)}
        />
      )}
      {showPDFDialog && data && (
        <PDFDownloadDialog
          open={showPDFDialog}
          onOpenChange={setShowPDFDialog}
          vin={data.vin}
          vehicleName={vehicleName}
        />
      )}
      <UsernameRequiredDialog
        open={showUsernameDialog}
        onComplete={() => { setShowUsernameDialog(false); setActiveView("contribute"); }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
function WorkspacePanel({
  view,
  label,
  dossier,
  onNavigate,
  vinId,
  vin,
  contributor,
}: {
  view: WorkspaceView;
  label: string;
  dossier: any;
  onNavigate: (view: WorkspaceView) => void;
  vinId: string;
  vin: string;
  contributor: any;
}) {
  if (view === "dashboard") {
    return (
      <DashboardView
        dossier={dossier}
        onNavigate={(target) => onNavigate(target as WorkspaceView)}
      />
    );
  }

  if (view === "owner") {
    return <OwnerView dossier={dossier} vinId={vinId} vin={vin} />;
  }

  if (view === "contributions") {
    return <ContributionsView dossier={dossier} />;
  }

  if (view === "photos") {
    return <PhotosView dossier={dossier} onNavigate={(t) => onNavigate(t as WorkspaceView)} />;
  }

  if (view === "documents") {
    return <DocumentsView dossier={dossier} onNavigate={(t) => onNavigate(t as WorkspaceView)} />;
  }

  if (view === "mileage") {
    return <MileageView dossier={dossier} />;
  }

  if (view === "contribute") {
    return (
      <ContributionGateway
        vinId={vinId}
        contributor={contributor}
        onContributionComplete={() => { /* success state handled inside */ }}
        onViewContributions={() => onNavigate("contributions")}
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-200">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground">{label}</h2>
      </header>
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">Vue à venir.</p>
      </div>
    </div>
  );
}

export default VINDetail;
