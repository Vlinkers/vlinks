import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContributionForm } from "@/components/ContributionForm";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { UsernameRequiredDialog } from "@/components/UsernameRequiredDialog";
import { PDFDownloadDialog } from "@/components/PDFDownloadDialog";
import { useVINData, type ContributionType } from "@/hooks/useVINData";
import { useVINDecode } from "@/hooks/useVINDecode";
import { getContributionLabel, getContributionIcon, getContributionBadgeVariant } from "@/components/ContributionCard";
import { ContributionDetailDrawer } from "@/components/ContributionDetailDrawer";
import { AdminEditContribution } from "@/components/AdminEditContribution";
import { PhotoGallery } from "@/components/PhotoGallery";
import { useVINFollow } from "@/hooks/useVINFollow";
import { useAdmin } from "@/hooks/useAdmin";
import { 
  Shield, AlertTriangle, CheckCircle, FileText, ChevronRight, Clock, Camera,
  FileSearch, Eye, EyeOff, Plus, Loader2, User, Users, FileDown, Star, Trash2,
  ExternalLink, File, ChevronDown, Pencil, Calendar, MapPin
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PublicContribution, ContributionDocument } from "@/hooks/useVINData";

// ── Signal Proofs ──
function SignalProofs({ contributionIds, allContributions }: { contributionIds: string[]; allContributions: PublicContribution[] }) {
  const matched = allContributions.filter((c) => contributionIds.includes(c.id));
  if (matched.length === 0) {
    return <p className="text-xs text-muted-foreground px-4 pb-3">Aucune preuve accessible.</p>;
  }
  return (
    <div className="border-t border-border px-4 pb-3 pt-3 space-y-2">
      {matched.map((c) => (
        <div key={c.id} className="p-2.5 rounded-md bg-background border border-border text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{c.author}</span>
            <span className="text-muted-foreground">{c.date}</span>
          </div>
          {c.title && <p className="text-foreground/80">{c.title}</p>}
          {c.summaryPublic && !c.title && <p className="text-foreground/80">{c.summaryPublic}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Icon background color per contribution type ──
const getIconBgColor = (type: ContributionType): string => {
  switch (type) {
    case "inspection_report":
    case "vehicle_history":
    case "mechanic_conversation":
      return "bg-[#DCFCE7]"; // green
    case "observation":
    case "for_sale":
    case "price_change":
      return "bg-[#FEF3C7]"; // amber
    case "purchase_decision":
      return "bg-[#FEE2E2]"; // red
    case "photo_evidence":
      return "bg-[#F3E8FF]"; // violet
    case "owner_exchange":
    case "ownership_change":
    default:
      return "bg-[#F1F5F9]"; // gray
  }
};

const getIconColor = (type: ContributionType): string => {
  switch (type) {
    case "inspection_report":
    case "vehicle_history":
    case "mechanic_conversation":
      return "text-[#15803D]";
    case "observation":
    case "for_sale":
    case "price_change":
      return "text-[#92400E]";
    case "purchase_decision":
      return "text-[#B91C1C]";
    case "photo_evidence":
      return "text-[#7E22CE]";
    case "owner_exchange":
    case "ownership_change":
    default:
      return "text-[#475569]";
  }
};

// ── Filter categories ──
type FilterCategory = "all" | "reports" | "photos" | "signals" | "documents";

const FILTER_TABS: { key: FilterCategory; label: string; emoji: string; types: ContributionType[] }[] = [
  { key: "all", label: "Toutes", emoji: "", types: [] },
  { key: "reports", label: "Rapports", emoji: "📋", types: ["inspection_report", "vehicle_history", "mechanic_conversation"] },
  { key: "photos", label: "Photos", emoji: "📸", types: ["photo_evidence"] },
  { key: "signals", label: "Signalements", emoji: "⚠️", types: ["observation", "purchase_decision", "for_sale", "price_change"] },
  { key: "documents", label: "Documents", emoji: "📄", types: ["owner_exchange", "ownership_change"] },
];

const VINDetail = () => {
  const { vin } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useVINData(vin);
  const { data: vinDecode, isLoading: isDecodingVIN } = useVINDecode(vin);
  const { toast } = useToast();
  const { isAdmin, logAction } = useAdmin();
  const { isFollowing, isLoading: isFollowLoading, toggleFollow } = useVINFollow(vin);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState<'none' | 'pending' | 'verified' | 'rejected'>('none');
  const [isCheckingOwner, setIsCheckingOwner] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [observedSignals, setObservedSignals] = useState<{ id: string; text: string; count: number; firstObserved: string | null; lastObserved: string | null; contributionIds: string[] }[]>([]);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [userHasUsername, setUserHasUsername] = useState(true);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [isEndingOwnership, setIsEndingOwnership] = useState(false);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [editingContribution, setEditingContribution] = useState<PublicContribution | null>(null);
  const [selectedContribution, setSelectedContribution] = useState<PublicContribution | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCurrentUserId(null); setUserHasUsername(true); setIsCheckingOwner(false); return; }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('username').eq('user_id', user.id).maybeSingle();
      setUserHasUsername(!!(profile?.username && profile.username.length >= 3));
      if (data?.id) {
        const { data: v } = await supabase.from('owner_verifications').select('verification_status, ended_at').eq('user_id', user.id).eq('vin_id', data.id).is('ended_at', null).maybeSingle();
        setOwnerVerificationStatus(v ? v.verification_status as any : 'none');
      }
      setIsCheckingOwner(false);
    };
    check();
  }, [data?.id]);

  useEffect(() => {
    const fetchSignals = async () => {
      if (!data?.id) return;
      const { data: signalsData } = await supabase.from("observed_signals").select("id, signal_text, first_observed_at, last_observed_at").eq("vin_id", data.id);
      if (!signalsData || signalsData.length === 0) { setObservedSignals([]); return; }
      const signalIds = signalsData.map(s => s.id);
      const { data: links } = await (supabase.from("signal_contributions" as any).select("signal_id, contribution_id").in("signal_id", signalIds) as any);
      const linksBySignal = new Map<string, string[]>();
      ((links as any[]) || []).forEach((l: any) => {
        const arr = linksBySignal.get(l.signal_id) || [];
        arr.push(l.contribution_id);
        linksBySignal.set(l.signal_id, arr);
      });
      setObservedSignals(signalsData.map((s: any) => ({
        id: s.id, text: s.signal_text, count: (linksBySignal.get(s.id) || []).length,
        firstObserved: s.first_observed_at, lastObserved: s.last_observed_at,
        contributionIds: linksBySignal.get(s.id) || [],
      })).filter(s => s.count > 0).sort((a, b) => b.count - a.count));
    };
    fetchSignals();
  }, [data?.id]);

  const handleEndOwnership = async () => {
    if (!currentUserId || !data?.id) return;
    setIsEndingOwnership(true);
    try {
      await supabase.from('raw_contributions').update({ is_former_owner: true }).eq('user_id', currentUserId).eq('vin_id', data.id).eq('is_owner_contribution', true);
      const { error } = await supabase.from('owner_verifications').update({ ended_at: new Date().toISOString() }).eq('user_id', currentUserId).eq('vin_id', data.id).is('ended_at', null);
      if (error) throw error;
      setOwnerVerificationStatus('none');
      toast({ title: "Propriété terminée" });
      refetch();
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setIsEndingOwnership(false); }
  };

  const handleContributeClick = () => {
    if (!currentUserId) { navigate(`/auth?redirect=/vin/${vin}`); return; }
    if (!userHasUsername) { setShowUsernameDialog(true); return; }
    setShowContributionForm(true);
  };

  const handleFollowClick = async () => {
    if (!currentUserId) { navigate(`/auth?redirect=/vin/${vin}`); return; }
    const success = await toggleFollow();
    if (success) toast({ title: isFollowing ? "VIN retiré" : "VIN suivi", description: isFollowing ? "Vous ne suivez plus ce VIN." : "Vous recevrez les mises à jour." });
  };

  const handleAdminAction = async (contributionId: string, action: string) => {
    const statusMap: Record<string, string> = { approve: "approved", hide: "hidden", delete: "deleted" };
    const newStatus = statusMap[action];
    if (!newStatus) return;
    const { error } = await (supabase.from("public_contributions").update({ status: newStatus } as any).eq("id", contributionId) as any);
    if (!error) { await logAction(`contribution_${newStatus}`, "contribution", contributionId); toast({ title: `Contribution ${action === "approve" ? "approuvée" : action === "hide" ? "masquée" : "supprimée"}` }); refetch(); }
  };

  const AdminActions = ({ contributionId, contribution: c }: { contributionId: string; contribution?: PublicContribution }) => {
    if (!isAdmin) return null;
    return (
      <div className="flex gap-1.5 mt-3 pt-3 border-t border-border">
        {c && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setEditingContribution(c); }}>
            <Pencil className="w-3 h-3 mr-1" /> Modifier
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleAdminAction(contributionId, "hide"); }}>
          <EyeOff className="w-3 h-3 mr-1" /> Masquer
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs text-danger hover:bg-danger/5" onClick={(e) => { e.stopPropagation(); handleAdminAction(contributionId, "delete"); }}>
          <Trash2 className="w-3 h-3 mr-1" /> Supprimer
        </Button>
      </div>
    );
  };

  const vehicleName = vinDecode?.is_valid 
    ? [vinDecode.model_year, vinDecode.make, vinDecode.model, vinDecode.trim].filter(Boolean).join(' ')
    : data ? [data.year, data.make, data.model].filter(Boolean).join(' ') : "";

  // Loading
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
        <Footer />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="pt-20 pb-16">
          <div className="max-w-5xl mx-auto px-4 flex flex-col items-center justify-center min-h-[50vh]">
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm text-center">
              <AlertTriangle className="w-6 h-6 text-danger mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Erreur de chargement du dossier.</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // VIN not found
  if (!data) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="pt-20 pb-16">
          <div className="max-w-4xl mx-auto px-4">
            <nav className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="vin-code">{vin}</span>
            </nav>
            <div className="p-8 rounded-xl bg-card border border-border shadow-sm text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">Ce VIN n'a pas encore de dossier</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Soyez le premier à contribuer. Chaque information utile peut aider le prochain acheteur.
              </p>
              <Button size="lg" onClick={handleContributeClick}>
                <Plus className="w-4 h-4 mr-2" />
                {currentUserId ? "Ajouter une contribution" : "Se connecter pour contribuer"}
              </Button>
            </div>
          </div>
        </main>
        <Footer />
        {currentUserId && (
          <>
            <ContributionForm vinId={null} vin={vin || ""} open={showContributionForm} onOpenChange={setShowContributionForm} />
            <OwnerClaimForm vinId={null} vin={vin || ""} open={showOwnerForm} onOpenChange={setShowOwnerForm} />
          </>
        )}
      </div>
    );
  }

  // ── Main dossier view ──
  const contributions = data.contributions;
  const totalPhotos = contributions.reduce((acc, c) => acc + c.photoCount, 0);
  const totalDocs = contributions.reduce((acc, c) => acc + c.documentCount, 0);
  const allPhotos = contributions.flatMap(c => c.photos);
  const allDocuments = contributions.flatMap(c => c.documents);

  // Filter contributions by category
  const activeFilter = FILTER_TABS.find(f => f.key === filterCategory)!;
  const filteredContributions = filterCategory === "all"
    ? contributions
    : contributions.filter(c => activeFilter.types.includes(c.type));

  // Counts per filter tab
  const filterCounts: Record<FilterCategory, number> = {
    all: contributions.length,
    reports: contributions.filter(c => FILTER_TABS[1].types.includes(c.type)).length,
    photos: contributions.filter(c => FILTER_TABS[2].types.includes(c.type)).length,
    signals: contributions.filter(c => FILTER_TABS[3].types.includes(c.type)).length,
    documents: contributions.filter(c => FILTER_TABS[4].types.includes(c.type)).length,
  };

  const isVinValid = vinDecode?.is_valid !== false;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Header />
      <main className="pt-16 flex-1">

        {/* ═══ DARK HERO BANNER ═══ */}
        <div className="bg-[#0F172A] w-full">
          <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-[#64748B] mb-5">
              <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#94A3B8]">Dossier</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              {/* ── Left column ── */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#64748B]">
                  DOSSIER VÉHICULE
                </p>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white leading-tight">
                  {vehicleName || "Véhicule inconnu"}
                </h1>
                <p className="font-mono text-[15px] text-[#60A5FA] tracking-[0.08em]">
                  {vin}
                </p>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-[#94A3B8] text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    Québec
                  </Badge>
                  {data.contributions.some(c => c.mileageAtIntervention) && (() => {
                    const latestKm = data.contributions.find(c => c.mileageAtIntervention)?.mileageAtIntervention;
                    return latestKm ? (
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-[#94A3B8] text-xs">
                        {latestKm.toLocaleString()} km
                      </Badge>
                    ) : null;
                  })()}
                  {isVinValid ? (
                    <Badge variant="outline" className="bg-[#15803D]/10 border-[#15803D]/30 text-[#4ADE80] text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      VIN validé
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-[#B91C1C]/10 border-[#B91C1C]/30 text-[#FCA5A5] text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      VIN invalide
                    </Badge>
                  )}
                </div>
              </div>

              {/* ── Right column — counters ── */}
              <div className="flex items-end gap-6 md:gap-8">
                {[
                  { value: contributions.length, label: "Contributions" },
                  { value: totalDocs, label: "Documents" },
                  { value: observedSignals.length, label: "Signalements" },
                ].map((counter, i) => (
                  <div key={i} className="text-center">
                    <span className="block text-[32px] font-bold text-white leading-none font-display">
                      {counter.value}
                    </span>
                    <span className="block text-[12px] text-[#94A3B8] mt-1">
                      {counter.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-white/10">
              <Button onClick={handleContributeClick} size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Contribuer
              </Button>
              {data.totalContributions > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowPDFDialog(true)} className="bg-transparent border-white/20 text-white hover:bg-white/10">
                  <FileDown className="w-4 h-4 mr-1.5" />
                  Rapport PDF
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleFollowClick} 
                disabled={isFollowLoading}
                className="bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                <Star className={`w-4 h-4 mr-1.5 ${isFollowing ? "fill-current text-warning" : ""}`} />
                {isFollowing ? "Suivi" : "Suivre"}
              </Button>
              {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'none' && (
                <Button variant="outline" size="sm" onClick={() => setShowOwnerForm(true)} className="bg-transparent border-white/20 text-white hover:bg-white/10">
                  <Shield className="w-4 h-4 mr-1.5" />
                  Revendiquer
                </Button>
              )}
              {isAdmin && (
                <Button variant="outline" size="sm" asChild className="bg-transparent border-primary/40 text-[#60A5FA] hover:bg-primary/10">
                  <Link to="/admin/contributions"><Shield className="w-4 h-4 mr-1.5" /> Modérer</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* Owner status badges */}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'verified' && (
            <div className="mb-5 p-4 rounded-xl bg-success/5 border border-success/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <span className="text-sm font-medium text-success block">Propriétaire vérifié</span>
                  <span className="text-xs text-muted-foreground">Vos contributions sont marquées comme vérifiées</span>
                </div>
              </div>
              <button onClick={handleEndOwnership} disabled={isEndingOwnership} className="text-xs text-muted-foreground hover:text-foreground underline">
                {isEndingOwnership ? <Loader2 className="w-3 h-3 animate-spin" /> : "Révoquer"}
              </button>
            </div>
          )}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'pending' && (
            <div className="mb-5 p-4 rounded-xl bg-warning/5 border border-warning/20 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-warning" />
              </div>
              <div>
                <span className="text-sm font-medium text-warning block">Vérification en cours</span>
                <span className="text-xs text-muted-foreground">Nous examinons votre demande de propriété</span>
              </div>
            </div>
          )}

          {/* ═══ FILTER TABS ═══ */}
          <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
            {FILTER_TABS.map(tab => {
              const count = filterCounts[tab.key];
              const isActive = filterCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilterCategory(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    isActive 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {tab.emoji && <span>{tab.emoji}</span>}
                  {tab.label}
                  <span className={`text-xs ${isActive ? "text-primary/70" : "text-muted-foreground/60"}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* ═══ CONTRIBUTION LIST ═══ */}
          {filteredContributions.length > 0 ? (
            <div className="space-y-2">
              {filteredContributions.map(c => {
                const Icon = getContributionIcon(c.type);
                const thumbPhotos = c.photos.slice(0, 3);
                const extraPhotos = c.photos.length - 3;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContribution(c)}
                    className="w-full text-left rounded-xl bg-card border border-border shadow-sm p-4 hover:bg-slate-50 hover:border-primary/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      {/* Colored icon */}
                      <div className={`w-10 h-10 rounded-lg ${getIconBgColor(c.type)} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-5 h-5 ${getIconColor(c.type)}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title + badge */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground leading-snug">
                            {c.title || c.summaryPublic || getContributionLabel(c.type)}
                          </h3>
                          <Badge variant={getContributionBadgeVariant(c.type)} className="text-[11px] flex-shrink-0">
                            {getContributionLabel(c.type)}
                          </Badge>
                        </div>

                        {/* Meta line */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {c.author}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {c.interventionDate || c.date}
                          </span>
                          {c.mileageAtIntervention && (
                            <>
                              <span>·</span>
                              <span>{c.mileageAtIntervention.toLocaleString()} km</span>
                            </>
                          )}
                          {(c.hasPhotos || c.hasDocuments) && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                {c.hasPhotos && <><Camera className="w-3 h-3" /> {c.photoCount}</>}
                                {c.hasPhotos && c.hasDocuments && <span className="mx-0.5">/</span>}
                                {c.hasDocuments && <><File className="w-3 h-3" /> {c.documentCount}</>}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Photo thumbnails */}
                        {c.hasPhotos && thumbPhotos.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2.5">
                            {thumbPhotos.map((photo, i) => (
                              <div key={photo.id} className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border border-border">
                                <img
                                  src={photo.url}
                                  alt={photo.caption || "Photo"}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                {i === 2 && extraPhotos > 0 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">+{extraPhotos}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-card border border-border shadow-sm text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {filterCategory === "all" 
                  ? "Aucune contribution pour ce véhicule." 
                  : "Aucune contribution pour ce filtre."}
              </p>
              {filterCategory === "all" && (
                <Button className="mt-4" onClick={handleContributeClick}>
                  <Plus className="w-4 h-4 mr-1.5" /> Ajouter une contribution
                </Button>
              )}
            </div>
          )}

          {/* Observed signals section */}
          {observedSignals.length > 0 && (
            <section id="signals-section" className="mt-8 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="font-display text-sm font-semibold text-foreground">Signaux observés</h3>
                <Badge variant="outline" className="ml-auto text-warning border-warning/30 bg-warning/5">
                  {observedSignals.length}
                </Badge>
              </div>
              <div className="p-4 space-y-2">
                {observedSignals.map(signal => {
                  const lastMonth = signal.lastObserved ? new Date(signal.lastObserved).toLocaleDateString("fr-CA", { month: "short", year: "numeric" }) : null;
                  const isExpanded = expandedSignalId === signal.id;
                  return (
                    <div key={signal.id} className="rounded-lg border border-border overflow-hidden bg-muted/30">
                      <button onClick={() => setExpandedSignalId(isExpanded ? null : signal.id)} className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors">
                        <div className="w-6 h-6 rounded-md bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-foreground block">{signal.text}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{signal.count} source{signal.count > 1 ? "s" : ""}</span>
                            {lastMonth && <span className="text-xs text-muted-foreground">· {lastMonth}</span>}
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded && <SignalProofs contributionIds={signal.contributionIds} allContributions={contributions} />}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />

      <UsernameRequiredDialog open={showUsernameDialog} onComplete={() => { setShowUsernameDialog(false); setUserHasUsername(true); setShowContributionForm(true); }} />
      {currentUserId && (
        <>
          <ContributionForm vinId={data.id} vin={vin || ""} open={showContributionForm} onOpenChange={setShowContributionForm} onSuccess={() => refetch()} />
          <OwnerClaimForm vinId={data.id} vin={vin || ""} open={showOwnerForm} onOpenChange={setShowOwnerForm} onSuccess={() => refetch()} />
        </>
      )}
      <PDFDownloadDialog open={showPDFDialog} onOpenChange={setShowPDFDialog} vin={vin || ""} vehicleName={vehicleName} />
      <AdminEditContribution
        contribution={editingContribution}
        open={!!editingContribution}
        onOpenChange={(open) => { if (!open) setEditingContribution(null); }}
        onSaved={() => { setEditingContribution(null); refetch(); }}
        logAction={logAction}
      />
    </div>
  );
};

// ── Document row component ──
function DocRow({ doc }: { doc: ContributionDocument }) {
  const handleOpen = useCallback(async () => {
    if (!doc.filePath) return;
    const { data, error } = await supabase.storage.from("vin-documents").createSignedUrl(doc.filePath, 3600);
    if (error || !data?.signedUrl) {
      const { data: pub } = supabase.storage.from("vin-documents").getPublicUrl(doc.filePath);
      if (pub?.publicUrl) window.open(pub.publicUrl, "_blank");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }, [doc.filePath]);

  return (
    <button 
      onClick={handleOpen} 
      disabled={!doc.filePath}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-background text-left hover:border-primary/30 hover:bg-muted/30 transition-all group"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <File className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {doc.description && <span className="truncate">{doc.description}</span>}
          {doc.fileSize && <span>{(doc.fileSize / 1024).toFixed(0)} Ko</span>}
        </div>
      </div>
      <Badge variant="outline" className="text-[10px] font-mono">{doc.fileType?.split("/").pop()?.toUpperCase() || "DOC"}</Badge>
      {doc.filePath && <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
    </button>
  );
}

export default VINDetail;
