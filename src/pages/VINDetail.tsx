import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContributionForm } from "@/components/ContributionForm";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { UsernameRequiredDialog } from "@/components/UsernameRequiredDialog";
import { PDFDownloadDialog } from "@/components/PDFDownloadDialog";
import { useVINData, type ContributionType } from "@/hooks/useVINData";
import { useVINDecode } from "@/hooks/useVINDecode";
import { useVinDossier } from "@/hooks/useVinDossier";
import { getContributionLabel, getContributionIcon, getContributionBadgeVariant } from "@/components/ContributionCard";
import { ContributionDetailDrawer } from "@/components/ContributionDetailDrawer";
import { AdminEditContribution } from "@/components/AdminEditContribution";
import { PhotoGallery } from "@/components/PhotoGallery";
import { FeaturedPhotoModal } from "@/components/admin/FeaturedPhotoModal";
import { EmptyVINPage } from "@/components/EmptyVINPage";
import { useVINFollow } from "@/hooks/useVINFollow";
import { CompletenessScore } from "@/components/CompletenessScore";
import { VINPageFooter } from "@/components/VINPageFooter";
import { useAdmin } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { VinHero } from "@/components/vin/VinHero";
import { RedFlagsBanner } from "@/components/vin/RedFlagsBanner";
import { 
  Shield, AlertTriangle, CheckCircle, FileText, ChevronRight, Clock, Camera,
  FileSearch, Eye, EyeOff, Plus, Loader2, User, Users, FileDown, Star, Trash2,
  ExternalLink, File, ChevronDown, Pencil, Calendar, MapPin, ArrowUpDown, ArrowDown, ArrowUp,
  MessageSquare, Search, Share2, Link2, Mail, BookOpen, FolderOpen, PenTool
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { DocumentViewer } from "@/components/DocumentViewer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PublicContribution, ContributionDocument } from "@/hooks/useVINData";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
      return "bg-[hsl(142,72%,93%)]";
    case "observation":
    case "for_sale":
    case "price_change":
      return "bg-[hsl(48,96%,89%)]";
    case "purchase_decision":
      return "bg-[hsl(0,94%,94%)]";
    case "photo_evidence":
      return "bg-[hsl(270,95%,95%)]";
    case "owner_exchange":
    case "ownership_change":
    default:
      return "bg-muted";
  }
};

const getIconColor = (type: ContributionType): string => {
  switch (type) {
    case "inspection_report":
    case "vehicle_history":
    case "mechanic_conversation":
      return "text-[hsl(152,69%,25%)]";
    case "observation":
    case "for_sale":
    case "price_change":
      return "text-[hsl(26,83%,30%)]";
    case "purchase_decision":
      return "text-[hsl(0,72%,36%)]";
    case "photo_evidence":
      return "text-[hsl(271,76%,43%)]";
    case "owner_exchange":
    case "ownership_change":
    default:
      return "text-muted-foreground";
  }
};

// ── Filter categories ──
type FilterCategory = "all" | "reports" | "history" | "photos" | "signals" | "documents";

const FILTER_TABS: { key: FilterCategory; label: string; emoji: string; types: ContributionType[] }[] = [
  { key: "all", label: "Chronologie", emoji: "", types: [] },
  { key: "reports", label: "Rapports", emoji: "📋", types: ["inspection_report", "mechanic_conversation"] },
  { key: "history", label: "Historique", emoji: "📂", types: ["vehicle_history"] },
  { key: "photos", label: "Photos", emoji: "📸", types: ["photo_evidence"] },
  { key: "signals", label: "Signalements", emoji: "⚠️", types: ["observation", "purchase_decision", "for_sale", "price_change"] },
  { key: "documents", label: "Échanges", emoji: "💬", types: ["owner_exchange", "ownership_change"] },
];

const matchesFilterCategory = (contribution: PublicContribution, category: FilterCategory) => {
  if (category === "all") return true;
  if (category === "photos") return contribution.hasPhotos;
  const activeTab = FILTER_TABS.find((tab) => tab.key === category);
  return activeTab ? activeTab.types.includes(contribution.type) : false;
};

// ── Sticky Nav Tabs ──
const NAV_TABS = [
  { key: "synthese", label: "Synthèse", icon: Eye },
  { key: "narration", label: "Chronologie", icon: Clock },
  { key: "plongee", label: "Preuves", icon: FolderOpen },
  { key: "contribuer", label: "Contribuer", icon: PenTool },
] as const;

type NavTab = typeof NAV_TABS[number]["key"];

function StickyNav({ activeTab, onTabClick }: { activeTab: NavTab; onTabClick: (tab: NavTab) => void }) {
  return (
    <div className="sticky top-16 z-30 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-5xl mx-auto px-4">
        <nav className="flex gap-0 overflow-x-auto scrollbar-none -mb-px">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onTabClick(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

const VINDetail = () => {
  const { vin } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useVINData(vin);
  const { data: vinDecode, isLoading: isDecodingVIN } = useVINDecode(vin);
  const { toast } = useToast();
  const { isAdmin, logAction } = useAdmin();
  const { isFollowing, isLoading: isFollowLoading, toggleFollow } = useVINFollow(vin);
  const isMobile = useIsMobile();

  // New dossier data layer
  const { data: dossier, isLoading: isDossierLoading } = useVinDossier(data?.id);
  const hasDossierData = !!(dossier && dossier.events.length > 0);

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
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [lightboxPhotos, setLightboxPhotos] = useState<{ id: string; url: string; caption?: string | null }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showFeaturedPhotoModal, setShowFeaturedPhotoModal] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<ContributionDocument | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<NavTab>("synthese");
  const [faceBOpen, setFaceBOpen] = useState(false);

  // Section refs for scroll tracking
  const syntheseRef = useRef<HTMLDivElement>(null);
  const narrationRef = useRef<HTMLDivElement>(null);
  const plongeeRef = useRef<HTMLDivElement>(null);
  const contribuerRef = useRef<HTMLDivElement>(null);

  const openDocViewer = useCallback((doc: ContributionDocument) => {
    setViewerDoc(doc);
    setViewerOpen(true);
  }, []);

  const openLightbox = useCallback((photos: { id: string; url: string; caption?: string | null }[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);
  const [expandedTextIds, setExpandedTextIds] = useState<Set<string>>(new Set());

  // Scroll to section on tab click
  const handleNavTabClick = useCallback((tab: NavTab) => {
    setActiveNavTab(tab);
    const refs: Record<NavTab, React.RefObject<HTMLDivElement>> = {
      synthese: syntheseRef,
      narration: narrationRef,
      plongee: plongeeRef,
      contribuer: contribuerRef,
    };
    const ref = refs[tab];
    if (ref?.current) {
      const yOffset = -120;
      const y = ref.current.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const sectionRefs = [
      { key: "synthese" as NavTab, ref: syntheseRef },
      { key: "narration" as NavTab, ref: narrationRef },
      { key: "plongee" as NavTab, ref: plongeeRef },
      { key: "contribuer" as NavTab, ref: contribuerRef },
    ];

    const handleScroll = () => {
      const scrollY = window.scrollY + 150;
      let active: NavTab = "synthese";
      for (const section of sectionRefs) {
        if (section.ref.current) {
          const top = section.ref.current.offsetTop;
          if (scrollY >= top) active = section.key;
        }
      }
      setActiveNavTab(active);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/5" onClick={(e) => { e.stopPropagation(); handleAdminAction(contributionId, "delete"); }}>
          <Trash2 className="w-3 h-3 mr-1" /> Supprimer
        </Button>
      </div>
    );
  };

  const vehicleName = vinDecode?.is_valid 
    ? [vinDecode.model_year, vinDecode.make, vinDecode.model, vinDecode.trim].filter(Boolean).join(' ')
    : data ? [data.year, data.make, data.model].filter(Boolean).join(' ') : "";

  const seoTitle = vehicleName
    ? `${vehicleName} · Dossier VIN`
    : `${vin} · Dossier VIN`;

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = seoTitle;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    }
  }, [seoTitle]);

  // ── Loading state ──
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

  // ── Error state ──
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
        <Footer />
      </div>
    );
  }

  // ── Empty VIN — conversion-optimized page ──
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

  // ── Main dossier view ──
  const contributions = data.contributions;
  const totalPhotos = contributions.reduce((acc, c) => acc + c.photoCount, 0);
  const totalDocs = contributions.reduce((acc, c) => acc + c.documentCount, 0);

  const filteredContributions = contributions.filter((contribution) =>
    matchesFilterCategory(contribution, filterCategory)
  );

  const sortedContributions = [...filteredContributions].sort((a, b) => {
    const dateA = new Date(a.interventionDate ?? a.date).getTime();
    const dateB = new Date(b.interventionDate ?? b.date).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Group contributions by author + date into "episodes"
  interface Episode { key: string; dateLabel: string; author: string; contributions: PublicContribution[]; }
  const episodes: Episode[] = [];
  for (const c of sortedContributions) {
    const dateLabel = c.interventionDate || c.date;
    const key = `${c.author}|${dateLabel}`;
    const last = episodes[episodes.length - 1];
    if (last && last.key === key) {
      last.contributions.push(c);
    } else {
      episodes.push({ key, dateLabel, author: c.author, contributions: [c] });
    }
  }

  const authorContribCount = new Map<string, number>();
  for (const c of contributions) {
    const key = c.authorPublicId || c.author;
    authorContribCount.set(key, (authorContribCount.get(key) || 0) + 1);
  }

  const filterCounts = FILTER_TABS.reduce((acc, tab) => {
    if (tab.key === "all") acc[tab.key] = contributions.length;
    else if (tab.key === "photos") acc[tab.key] = totalPhotos;
    else acc[tab.key] = contributions.filter((contribution) => matchesFilterCategory(contribution, tab.key)).length;
    return acc;
  }, {} as Record<FilterCategory, number>);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Header />
      <main className="pt-16 flex-1">
        <SEO title={seoTitle} description={vehicleName ? `Dossier VIN complet pour ${vehicleName}. Historique, inspections, signalements et photos contributifs.` : `Dossier VIN pour ${vin} sur VLINKS.`} />

        {/* ═══ SPEED 1: HERO — 5-second read ═══ */}
        <div ref={syntheseRef} id="synthese">
          {dossier ? (
            <>
              <VinHero dossier={dossier} />
              <RedFlagsBanner
                redFlags={dossier.redFlags}
                onFlagClick={(flagId) => {
                  const el = document.getElementById("signals-section");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            </>
          ) : (
            /* Fallback: legacy hero banner */
            <div className="bg-[hsl(222,47%,11%)] w-full relative overflow-hidden">
              {data.featuredPhotoUrl && (
                <>
                  <img src={data.featuredPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)]" />
                </>
              )}
              <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-10">
                <nav className="flex items-center gap-2 text-xs text-[hsl(215,16%,47%)] mb-5">
                  <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-[hsl(215,25%,65%)]">{vehicleName || vin}</span>
                </nav>
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[hsl(215,16%,47%)]">DOSSIER VÉHICULE</p>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-white leading-tight">{vehicleName || "Véhicule inconnu"}</h1>
                  <p className="font-mono text-[15px] text-[hsl(217,91%,68%)] tracking-[0.08em]">{vin}</p>
                  <div className="flex items-end gap-6 pt-4">
                    <div className="text-center">
                      <span className="block text-[32px] font-bold text-white leading-none font-display">{contributions.length}</span>
                      <span className="block text-[12px] text-[hsl(215,25%,65%)] mt-1">Contributions</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[32px] font-bold text-white leading-none font-display">{data.uniqueContributors}</span>
                      <span className="block text-[12px] text-[hsl(215,25%,65%)] mt-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" />{data.uniqueContributors === 1 ? "Vlinker" : "Vlinkers"}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[32px] font-bold text-white leading-none font-display">{totalDocs}</span>
                      <span className="block text-[12px] text-[hsl(215,25%,65%)] mt-1">Documents</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons row */}
          <div className="bg-[hsl(222,47%,11%)] border-t border-white/10">
            <div className="max-w-5xl mx-auto px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10" onClick={async (e) => {
                      if (navigator.share) { e.preventDefault(); await handleShare(); }
                    }}>
                      <Share2 className="w-4 h-4 mr-1.5" />
                      Partager
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast({ title: "Lien copié", description: "Le lien a été copié dans le presse-papier." });
                      }}
                    >
                      <Link2 className="w-4 h-4" /> Copier le lien
                    </button>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(seoTitle)}&body=${encodeURIComponent(window.location.href)}`}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    >
                      <Mail className="w-4 h-4" /> Partager par email
                    </a>
                  </PopoverContent>
                </Popover>
                {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'none' && (
                  <Button variant="outline" size="sm" onClick={() => setShowOwnerForm(true)} className="bg-transparent border-white/20 text-white hover:bg-white/10">
                    <Shield className="w-4 h-4 mr-1.5" />
                    Revendiquer
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button variant="outline" size="sm" asChild className="bg-transparent border-primary/40 text-[hsl(217,91%,68%)] hover:bg-primary/10">
                      <Link to="/admin/contributions"><Shield className="w-4 h-4 mr-1.5" /> Modérer</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowFeaturedPhotoModal(true)} className="bg-transparent border-primary/40 text-[hsl(217,91%,68%)] hover:bg-primary/10">
                      <Camera className="w-4 h-4 mr-1.5" /> Photo vedette
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ STICKY NAVIGATION TABS ═══ */}
        <StickyNav activeTab={activeNavTab} onTabClick={handleNavTabClick} />

        {/* ═══ MAIN CONTENT AREA ═══ */}
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

          {/* Owner status badges */}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'verified' && (
            <div className="p-4 rounded-xl bg-[hsl(152,69%,38%,0.05)] border border-[hsl(152,69%,38%,0.2)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[hsl(152,69%,38%,0.1)] flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-[hsl(152,69%,38%)]" />
                </div>
                <div>
                  <span className="text-sm font-medium text-[hsl(152,69%,38%)] block">Propriétaire vérifié</span>
                  <span className="text-xs text-muted-foreground">Vos contributions sont marquées comme vérifiées</span>
                </div>
              </div>
              <button onClick={handleEndOwnership} disabled={isEndingOwnership} className="text-xs text-muted-foreground hover:text-foreground underline">
                {isEndingOwnership ? <Loader2 className="w-3 h-3 animate-spin" /> : "Révoquer"}
              </button>
            </div>
          )}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'pending' && (
            <div className="p-4 rounded-xl bg-[hsl(38,92%,50%,0.05)] border border-[hsl(38,92%,50%,0.2)] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(38,92%,50%,0.1)] flex items-center justify-center">
                <Clock className="w-4 h-4 text-[hsl(38,92%,50%)]" />
              </div>
              <div>
                <span className="text-sm font-medium text-[hsl(38,92%,50%)] block">Vérification en cours</span>
                <span className="text-xs text-muted-foreground">Nous examinons votre demande de propriété</span>
              </div>
            </div>
          )}

          {/* Completeness score */}
          <CompletenessScore
            contributions={contributions}
            onAddType={() => setShowContributionForm(true)}
          />

          {/* ═══ VERDICT DU DOSSIER ═══ */}
          {(() => {
            const NEGATIVE_KEYWORDS = ["abandon", "ne pas acheter", "ppi négatif", "failed", "échec", "refusé", "déconseillé"];
            const inspectionContribs = contributions.filter(c => c.type === "inspection_report");
            const historyContribs = contributions.filter(c => c.type === "vehicle_history");
            const hasNegative = inspectionContribs.some(c => {
              const text = [c.title, c.summaryPublic, c.details].filter(Boolean).join(" ").toLowerCase();
              return NEGATIVE_KEYWORDS.some(kw => text.includes(kw));
            });
            const hasInspection = inspectionContribs.length > 0;
            const hasDocumentedHistory = historyContribs.some(c => c.hasDocuments || c.hasPhotos);

            let bgClass = "bg-muted/50 border-border";
            let textClass = "text-muted-foreground";
            let icon = "📋";
            let message = "Dossier en cours de construction";
            let subtitle = "Aucun rapport d'inspection soumis pour le moment";

            if (hasInspection && hasNegative) {
              bgClass = "bg-destructive/5 border-destructive/20";
              textClass = "text-destructive";
              icon = "🚨";
              message = "Achat abandonné suite à inspection";
              subtitle = `${inspectionContribs.length} rapport${inspectionContribs.length > 1 ? "s" : ""} d'inspection au dossier`;
            } else if (hasInspection && hasDocumentedHistory) {
              bgClass = "bg-[hsl(152,69%,38%,0.05)] border-[hsl(152,69%,38%,0.2)]";
              textClass = "text-[hsl(152,69%,38%)]";
              icon = "✅";
              message = "Dossier solide — Entretien vérifié + inspection réalisée";
              subtitle = `${inspectionContribs.length} rapport${inspectionContribs.length > 1 ? "s" : ""} + historique documenté`;
            } else if (hasInspection) {
              bgClass = "bg-[hsl(152,69%,38%,0.05)] border-[hsl(152,69%,38%,0.2)]";
              textClass = "text-[hsl(152,69%,38%)]";
              icon = "✅";
              message = "Inspection(s) au dossier — aucun signal négatif";
              subtitle = `${inspectionContribs.length} rapport${inspectionContribs.length > 1 ? "s" : ""} d'inspection au dossier`;
            } else if (hasDocumentedHistory) {
              bgClass = "bg-[hsl(152,69%,38%,0.05)] border-[hsl(152,69%,38%,0.2)]";
              textClass = "text-[hsl(152,69%,38%)]";
              icon = "✅";
              message = "Historique d'entretien documenté";
              subtitle = `${historyContribs.length} entrée${historyContribs.length > 1 ? "s" : ""} d'historique avec pièces jointes`;
            }

            return (
              <div className={`p-4 rounded-xl border flex items-center gap-3 ${bgClass}`}>
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div>
                  <span className={`text-sm font-semibold block ${textClass}`}>{message}</span>
                  <span className="text-xs text-muted-foreground">{subtitle}</span>
                </div>
              </div>
            );
          })()}

          {/* ═══ SPEED 2: NARRATION — Chronologie ═══ */}
          <section ref={narrationRef} id="narration">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              Chronologie du véhicule
            </h2>

            {/* Observed signals */}
            {observedSignals.length > 0 && (
              <div id="signals-section" className="mb-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <h3 className="font-display text-sm font-semibold text-foreground">Signaux observés</h3>
                  <Badge variant="outline" className="ml-auto text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%,0.3)] bg-[hsl(38,92%,50%,0.05)]">
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
                          <div className="w-6 h-6 rounded-md bg-[hsl(38,92%,50%,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-[hsl(38,92%,50%)]" />
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
              </div>
            )}

            {/* Filter tabs (legacy) */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mb-4 pb-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterCategory(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filterCategory === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.emoji && <span>{tab.emoji}</span>}
                  {tab.label}
                  {filterCounts[tab.key] > 0 && (
                    <span className={`text-[10px] ml-0.5 ${filterCategory === tab.key ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {filterCounts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sort toggle */}
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              >
                {sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                {sortOrder === 'desc' ? 'Récent → Ancien' : 'Ancien → Récent'}
              </button>
            </div>

            {/* ═══ LEGACY TIMELINE ═══ */}
            {episodes.length > 0 ? (
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-0">
                  {episodes.map((episode, epIdx) => {
                    const isLastEpisode = epIdx === episodes.length - 1;
                    const isMajor = episode.contributions.some(c =>
                      ["inspection_report", "ownership_change", "for_sale", "purchase_decision"].includes(c.type)
                    );
                    return (
                      <div key={episode.key + epIdx} className="relative">
                        <div className="flex items-center gap-3 mb-2 relative">
                          <div className="relative z-10 flex items-center justify-center flex-shrink-0 w-10 h-10">
                            <div className={`rounded-full border-2 bg-card ${isMajor ? "w-4 h-4 border-primary bg-primary" : "w-2.5 h-2.5 border-muted-foreground/40"}`} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground tracking-wide">{episode.dateLabel}</span>
                            <span className="text-xs text-muted-foreground">— {episode.author}{episode.contributions.length > 1 && ` · ${episode.contributions.length} contributions`}</span>
                          </div>
                        </div>
                        <div className={`ml-10 pl-3 space-y-2 ${isLastEpisode ? 'pb-2' : 'pb-6'}`}>
                          {episode.contributions.map(c => {
                            const Icon = getContributionIcon(c.type);
                            const thumbPhotos = c.photos.slice(0, 3);
                            const extraPhotos = c.photos.length - 3;
                            return (
                              <div key={c.id} className="w-full text-left rounded-xl bg-card border border-border shadow-sm p-4 hover:border-primary/20 transition-all">
                                <div className="flex items-start gap-3">
                                  <button onClick={() => setSelectedContribution(c)} className={`w-10 h-10 rounded-lg ${getIconBgColor(c.type)} flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity`}>
                                    <Icon className={`w-5 h-5 ${getIconColor(c.type)}`} />
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <button onClick={() => setSelectedContribution(c)} className="text-sm font-semibold text-foreground leading-snug hover:text-primary transition-colors text-left cursor-pointer">
                                        {(() => {
                                          const bodyText = c.details || c.summaryPublic || "";
                                          if (c.title && c.title !== c.summaryPublic && !bodyText.startsWith(c.title)) return c.title;
                                          return getContributionLabel(c.type);
                                        })()}
                                      </button>
                                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                                        <Badge variant={getContributionBadgeVariant(c.type)} className="text-[11px]">{getContributionLabel(c.type)}</Badge>
                                        {(c.hasDocuments || c.hasPhotos) && (
                                          <Badge variant="outline" className="text-[10px] bg-[hsl(152,69%,38%,0.05)] border-[hsl(152,69%,38%,0.2)] text-[hsl(152,69%,38%)]">📎 Pièce jointe</Badge>
                                        )}
                                        {(authorContribCount.get(c.authorPublicId || c.author) || 0) >= 2 && (
                                          <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">✓ Vlinker actif</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 flex-wrap">
                                      {c.mileageAtIntervention && <span>{c.mileageAtIntervention.toLocaleString()} km</span>}
                                      {c.askingPrice && (<>{c.mileageAtIntervention && <span>·</span>}<span>{c.askingPrice.toLocaleString()} $</span></>)}
                                      {(c.hasPhotos || c.hasDocuments) && (
                                        <>{(c.mileageAtIntervention || c.askingPrice) && <span>·</span>}<span className="flex items-center gap-1">{c.hasPhotos && <><Camera className="w-3 h-3" /> {c.photoCount}</>}{c.hasPhotos && c.hasDocuments && <span className="mx-0.5">/</span>}{c.hasDocuments && <><File className="w-3 h-3" /> {c.documentCount}</>}</span></>
                                      )}
                                    </div>
                                    {(() => {
                                      const bodyText = c.details || c.summaryPublic || "";
                                      if (!bodyText) return null;
                                      const isLong = bodyText.length > 200;
                                      const isExpanded = expandedTextIds.has(c.id);
                                      const shownText = isLong && !isExpanded ? bodyText.slice(0, 200) + "…" : bodyText;
                                      return (
                                        <div className="mt-2">
                                          <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{shownText}</p>
                                          {isLong && !isExpanded && (
                                            <button onClick={(e) => { e.stopPropagation(); setExpandedTextIds(prev => new Set(prev).add(c.id)); }} className="text-xs text-primary font-medium mt-1 hover:underline cursor-pointer">
                                              Lire la suite
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    {c.hasPhotos && thumbPhotos.length > 0 && (
                                      <div className="flex items-center gap-1.5 mt-2.5">
                                        {thumbPhotos.map((photo, i) => (
                                          <button key={photo.id} onClick={() => openLightbox(c.photos, i)} className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border border-border cursor-pointer hover:opacity-90 transition-opacity">
                                            <img src={photo.url} alt={photo.caption || "Photo"} className="w-full h-full object-cover" loading="lazy" />
                                            {i === 2 && extraPhotos > 0 && (
                                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-xs font-bold">+{extraPhotos}</span></div>
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <AdminActions contributionId={c.id} contribution={c} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-xl bg-card border border-border shadow-sm text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {filterCategory === "all" ? "Aucune contribution pour ce véhicule." : "Aucune contribution pour ce filtre."}
                </p>
                {filterCategory === "all" && (
                  <Button className="mt-4" onClick={handleContributeClick}><Plus className="w-4 h-4 mr-1.5" /> Ajouter une contribution</Button>
                )}
              </div>
            )}
          </section>

          {/* ═══ SPEED 3: PLONGÉE — Documents et preuves ═══ */}
          <section ref={plongeeRef} id="plongee">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <FolderOpen className="w-5 h-5 text-primary" />
              Documents et preuves
            </h2>
            <div className="p-8 rounded-xl bg-card border border-dashed border-border text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <FolderOpen className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Section en construction</p>
              <p className="text-xs text-muted-foreground mt-1">L'espace de preuves documentées sera disponible prochainement.</p>
            </div>
          </section>

          {/* ═══ FACE A / FACE B PANELS ═══ */}
          <section>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Face A — Community dossier (70%) */}
              <div className="flex-1 lg:w-[70%]">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  Dossier communautaire
                  <Badge variant="outline" className="text-[10px] ml-1">Face A</Badge>
                </h2>
                <div className="p-8 rounded-xl bg-card border border-dashed border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Les faits de la communauté (acheteurs, mécaniciens, inspecteurs) seront affichés ici.
                  </p>
                </div>
              </div>

              {/* Face B — Owner space (30%) */}
              <div className="lg:w-[30%]">
                {isMobile ? (
                  <Collapsible open={faceBOpen} onOpenChange={setFaceBOpen}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                        <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[hsl(152,69%,38%)]" />
                          Espace propriétaire
                          <Badge variant="outline" className="text-[10px]">Face B</Badge>
                        </h2>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${faceBOpen ? "rotate-180" : ""}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-6 mt-2 rounded-xl bg-card border border-dashed border-border text-center">
                        <p className="text-sm text-muted-foreground">
                          L'espace propriétaire sera disponible prochainement.
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <>
                    <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-[hsl(152,69%,38%)]" />
                      Espace propriétaire
                      <Badge variant="outline" className="text-[10px] ml-1">Face B</Badge>
                    </h2>
                    <div className="p-6 rounded-xl bg-card border border-dashed border-border text-center">
                      <p className="text-sm text-muted-foreground">
                        L'espace propriétaire sera disponible prochainement.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ═══ CONTRIBUTION SECTION ═══ */}
          <section ref={contribuerRef} id="contribuer">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <PenTool className="w-5 h-5 text-primary" />
              Contribuer à ce dossier
            </h2>
            <div className="p-6 rounded-xl bg-card border border-border shadow-sm text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Partagez vos informations, photos ou documents pour enrichir ce dossier.
              </p>
              <Button onClick={handleContributeClick}>
                <Plus className="w-4 h-4 mr-1.5" />
                Ajouter une contribution
              </Button>
            </div>
          </section>
        </div>
      </main>

      <VINPageFooter
        make={vinDecode?.make || data?.make}
        model={vinDecode?.model || data?.model}
        currentVin={vin || ""}
        onContribute={handleContributeClick}
      />

      <Footer />

      <ContributionDetailDrawer
        contribution={selectedContribution}
        open={!!selectedContribution}
        onOpenChange={(open) => { if (!open) setSelectedContribution(null); }}
        adminActions={selectedContribution && isAdmin ? <AdminActions contributionId={selectedContribution.id} contribution={selectedContribution} /> : undefined}
        isActiveVlinker={selectedContribution ? (authorContribCount.get(selectedContribution.authorPublicId || selectedContribution.author) || 0) >= 2 : false}
      />

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
      <PhotoLightbox
        photos={lightboxPhotos}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
      {isAdmin && data && (
        <FeaturedPhotoModal
          open={showFeaturedPhotoModal}
          onOpenChange={setShowFeaturedPhotoModal}
          vinId={data.id}
          vinCode={data.vin}
          currentFeaturedUrl={data.featuredPhotoUrl}
          onSaved={() => refetch()}
        />
      )}
      <DocumentViewer doc={viewerDoc} open={viewerOpen} onOpenChange={setViewerOpen} />
    </div>
  );
};

// ── Document row component ──
function DocRow({ doc, onOpen }: { doc: ContributionDocument; onOpen: (doc: ContributionDocument) => void }) {
  return (
    <button 
      onClick={() => onOpen(doc)} 
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
      {doc.filePath && <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
    </button>
  );
}

export default VINDetail;
