import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContributionForm } from "@/components/ContributionForm";
import { OwnerClaimForm } from "@/components/OwnerClaimForm";
import { UsernameRequiredDialog } from "@/components/UsernameRequiredDialog";
import { PDFDownloadDialog } from "@/components/PDFDownloadDialog";
import { useVINData, type ContributionType } from "@/hooks/useVINData";
import { useVINDecode } from "@/hooks/useVINDecode";
import { VehicleIdentificationCard } from "@/components/VehicleIdentificationCard";
import { ContributionCard, getContributionLabel } from "@/components/ContributionCard";
import { AdminEditContribution } from "@/components/AdminEditContribution";
import { PhotoGallery } from "@/components/PhotoGallery";
import { useVINFollow } from "@/hooks/useVINFollow";
import { useAdmin } from "@/hooks/useAdmin";
import { 
  Shield, AlertTriangle, CheckCircle, FileText, ChevronRight, Clock, Camera,
  FileSearch, Eye, EyeOff, Plus, Loader2, User, FileDown, Star, Trash2,
  ExternalLink, File, ChevronDown, Pencil
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
  const [filterType, setFilterType] = useState<ContributionType | "all">("all");

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

  const AdminActions = ({ contributionId }: { contributionId: string }) => {
    if (!isAdmin) return null;
    return (
      <div className="flex gap-1.5 mt-3 pt-3 border-t border-border">
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
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-mono">{vin}</span>
            </nav>

            <VehicleIdentificationCard vin={vin || ""} vinDecode={vinDecode} isLoading={isDecodingVIN} />
            
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
  const filteredContributions = filterType === "all" ? contributions : contributions.filter(c => c.type === filterType);

  const allContributionTypes: { type: ContributionType | "all"; label: string; count: number }[] = [
    { type: "all", label: "Tout", count: contributions.length },
    ...["inspection_report","vehicle_history","owner_exchange","mechanic_conversation","photo_evidence","observation","purchase_decision","ownership_change","for_sale","price_change"]
      .map(t => ({ type: t as ContributionType, label: getContributionLabel(t as ContributionType), count: contributions.filter(c => c.type === t).length }))
      .filter(t => t.count > 0),
  ];

  const statTiles = [
    { icon: FileText, value: contributions.length, label: "Contributions", color: "text-primary" },
    { icon: FileSearch, value: totalDocs, label: "Documents", color: "text-primary" },
    { icon: Camera, value: totalPhotos, label: "Photos", color: "text-primary" },
    { icon: AlertTriangle, value: observedSignals.length, label: "Signaux", color: "text-warning" },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Header />
      <main className="pt-16 pb-12 flex-1">
        <div className="max-w-5xl mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-mono">{vin}</span>
          </nav>

          {/* A. Vehicle Header */}
          <VehicleIdentificationCard vin={vin || ""} vinDecode={vinDecode} isLoading={isDecodingVIN} lastUpdated={data.lastUpdated} />

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <Button onClick={handleContributeClick} className="shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Ajouter une contribution
            </Button>
            {data.totalContributions > 0 && (
              <Button variant="outline" onClick={() => setShowPDFDialog(true)} className="bg-card">
                <FileDown className="w-4 h-4 mr-1.5" />
                Rapport PDF
              </Button>
            )}
            <Button 
              variant={isFollowing ? "secondary" : "outline"} 
              onClick={handleFollowClick} 
              disabled={isFollowLoading}
              className="bg-card"
            >
              <Star className={`w-4 h-4 mr-1.5 ${isFollowing ? "fill-current text-warning" : ""}`} />
              {isFollowing ? "Suivi" : "Suivre"}
            </Button>
            {isAdmin && (
              <Button variant="outline" asChild className="bg-card border-primary/30 text-primary hover:bg-primary/5">
                <Link to="/admin/contributions"><Shield className="w-4 h-4 mr-1.5" /> Modérer</Link>
              </Button>
            )}
          </div>

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

          {/* B. Stats tiles — more dense and professional */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {statTiles.map((t, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
                  <t.icon className={`w-5 h-5 ${t.color}`} />
                </div>
                <div className="min-w-0">
                  <span className="font-display text-xl font-bold text-foreground block leading-none">{t.value}</span>
                  <span className="text-xs text-muted-foreground">{t.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* C. Tabs — more robust product-like navigation */}
          <Tabs defaultValue="overview" className="w-full">
            <div className="bg-card border border-border rounded-xl p-1.5 mb-5">
              <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all">
                  Aperçu
                </TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all">
                  Chronologie
                  {contributions.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{contributions.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all">
                  Documents
                  {totalDocs > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{totalDocs}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="photos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all">
                  Photos
                  {totalPhotos > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{totalPhotos}</Badge>}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Aperçu ── */}
            <TabsContent value="overview" className="space-y-5 mt-0">
              <div className="grid gap-5 lg:grid-cols-3">
                {/* Left column: Recent + Signals */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Latest contributions */}
                  {contributions.length > 0 && (
                    <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-display text-sm font-semibold text-foreground">Derniers éléments</h3>
                        {contributions.length > 3 && (
                          <button 
                            onClick={() => { const el = document.querySelector('[data-value="timeline"]') as HTMLElement; el?.click(); }} 
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            Tout voir <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-border">
                        {contributions.slice(0, 3).map(c => (
                          <div key={c.id} className="p-4">
                            <ContributionCard contribution={c} compact adminActions={<AdminActions contributionId={c.id} />} />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Observed signals */}
                  <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <h3 className="font-display text-sm font-semibold text-foreground">Signaux observés</h3>
                      {observedSignals.length > 0 && (
                        <Badge variant="outline" className="ml-auto text-warning border-warning/30 bg-warning/5">
                          {observedSignals.length}
                        </Badge>
                      )}
                    </div>
                    <div className="p-4">
                      {observedSignals.length > 0 ? (
                        <div className="space-y-2">
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
                      ) : (
                        <div className="text-center py-6">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2">
                            <Eye className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">Aucun signal observé</p>
                          <p className="text-xs text-muted-foreground mt-1">Les signaux apparaîtront ici lorsque les contributeurs en rapporteront.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right column: Quick access */}
                <div className="space-y-5">
                  {/* Recent documents */}
                  <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold text-foreground">Documents</h3>
                      {allDocuments.length > 3 && (
                        <button 
                          onClick={() => { const el = document.querySelector('[data-value="documents"]') as HTMLElement; el?.click(); }} 
                          className="text-xs text-primary hover:underline"
                        >
                          Tout voir
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      {allDocuments.length > 0 ? (
                        <div className="space-y-2">
                          {allDocuments.slice(0, 3).map(doc => (
                            <DocRow key={doc.id} doc={doc} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-xs text-muted-foreground">Aucun document</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Recent photos */}
                  <section className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold text-foreground">Photos</h3>
                      {allPhotos.length > 6 && (
                        <button 
                          onClick={() => { const el = document.querySelector('[data-value="photos"]') as HTMLElement; el?.click(); }} 
                          className="text-xs text-primary hover:underline"
                        >
                          Tout voir
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      {allPhotos.length > 0 ? (
                        <PhotoGallery photos={allPhotos.slice(0, 6)} />
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-xs text-muted-foreground">Aucune photo</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* Contribute CTA if empty */}
              {contributions.length === 0 && (
                <div className="p-8 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Aucune contribution pour ce véhicule. Soyez le premier à enrichir ce dossier.</p>
                  <Button onClick={handleContributeClick}>
                    <Plus className="w-4 h-4 mr-1.5" /> Ajouter une contribution
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── Chronologie ── */}
            <TabsContent value="timeline" className="mt-0">
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                {/* Filters */}
                {allContributionTypes.length > 2 && (
                  <div className="p-4 border-b border-border">
                    <div className="flex flex-wrap gap-2">
                      {allContributionTypes.map(t => (
                        <button 
                          key={t.type} 
                          onClick={() => setFilterType(t.type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            filterType === t.type 
                              ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                              : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                          }`}
                        >
                          {t.label} <span className="opacity-70">({t.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {filteredContributions.length > 0 ? (
                  <div className="divide-y divide-border">
                    {filteredContributions.map(c => (
                      <div key={c.id} className="p-4">
                        <ContributionCard contribution={c} adminActions={<AdminActions contributionId={c.id} />} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Aucune contribution pour ce filtre.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Documents ── */}
            <TabsContent value="documents" className="mt-0">
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                {allDocuments.length > 0 ? (
                  <div className="p-4 space-y-2">
                    {allDocuments.map(doc => <DocRow key={doc.id} doc={doc} />)}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <FileSearch className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Aucun document disponible.</p>
                    <p className="text-xs text-muted-foreground mt-1">Les documents ajoutés par les contributeurs apparaîtront ici.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Photos ── */}
            <TabsContent value="photos" className="mt-0">
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                {allPhotos.length > 0 ? (
                  <div className="p-4">
                    <PhotoGallery photos={allPhotos} />
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Aucune photo disponible.</p>
                    <p className="text-xs text-muted-foreground mt-1">Les photos ajoutées par les contributeurs apparaîtront ici.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Owner claim link */}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'none' && (
            <div className="mt-8 text-center">
              <button onClick={() => setShowOwnerForm(true)} className="text-xs text-muted-foreground hover:text-foreground underline">
                Vous êtes le propriétaire ? Revendiquer ce VIN
              </button>
            </div>
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
