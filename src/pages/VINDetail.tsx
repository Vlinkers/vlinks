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
  FileText, Gauge, Plus, FileDown, Share2,
} from "lucide-react";
import { DashboardView } from "@/components/vin/DashboardView";

// ─────────────────────────────────────────────────────────────────────────────
type WorkspaceView = "dashboard" | "contributions" | "photos" | "documents" | "mileage" | "contribute";

const NAV_ITEMS: { key: WorkspaceView; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "contributions", label: "Contributions", icon: MessageSquare },
  { key: "photos", label: "Photos", icon: Camera },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "mileage", label: "Kilométrage", icon: Gauge },
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
    setShowContributionForm(true);
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
            <div className="p-4 border-b border-white/10">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[hsl(152,69%,50%)] mb-2">
                Dossier véhicule
              </p>
              <h1 className="font-display text-base font-bold leading-tight mb-2">
                {vehicleName || "Véhicule inconnu"}
              </h1>
              <button
                onClick={copyVin}
                className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[hsl(152,69%,60%)] hover:text-white transition-colors group mb-2"
                title="Copier le VIN"
              >
                <span className="truncate">{data.vin}</span>
                <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 flex-shrink-0" />
              </button>
              {vehicleSpecs && (
                <p className="text-[11px] text-white/50 leading-relaxed">{vehicleSpecs}</p>
              )}
            </div>

            {/* Nav */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavSelect(item.key)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all text-left border-l-2",
                      isActive
                        ? "bg-white/10 border-[hsl(152,69%,50%)] text-white font-medium"
                        : "border-transparent text-white/60 hover:bg-white/[0.06] hover:text-white/90"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer actions */}
            <div className="p-3 border-t border-white/10 space-y-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPDFDialog(true)}
                className="w-full justify-start text-white/70 hover:text-white hover:bg-white/[0.06] h-8 text-xs"
              >
                <FileDown className="w-3.5 h-3.5 mr-2" />
                Rapport PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="w-full justify-start text-white/70 hover:text-white hover:bg-white/[0.06] h-8 text-xs"
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
            <WorkspacePanel view={activeView} label={activeLabel} dossier={dossier} />
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
      {showContributionForm && data && (
        <ContributionGateway
          vinId={data.id}
          contributor={contributor}
          onContributionComplete={() => setShowContributionForm(false)}
        />
      )}
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
        onComplete={() => { setShowUsernameDialog(false); setShowContributionForm(true); }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder panel — content per view will be filled in subsequent prompts
function WorkspacePanel({
  view,
  label,
  dossier,
}: {
  view: WorkspaceView;
  label: string;
  dossier: any;
}) {
  return (
    <div className="animate-in fade-in duration-200">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground">{label}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cette vue sera enrichie prochainement.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Placeholder — contenu de la vue <span className="font-semibold text-foreground">{label}</span>.
        </p>
        {dossier && (
          <p className="text-xs text-muted-foreground mt-3">
            Données disponibles : {dossier.stats?.totalEvents ?? 0} événement(s),{" "}
            {dossier.stats?.totalFacts ?? 0} fait(s).
          </p>
        )}
      </div>
    </div>
  );
}

export default VINDetail;
