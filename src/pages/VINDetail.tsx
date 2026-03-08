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
import { ContributionCard, getContributionIcon, getContributionLabel, getContributionColor } from "@/components/ContributionCard";
import { PhotoGallery } from "@/components/PhotoGallery";
import { useVINFollow } from "@/hooks/useVINFollow";
import { useAdmin } from "@/hooks/useAdmin";
import { 
  Shield, AlertTriangle, CheckCircle, FileText, ChevronRight, Clock, Camera,
  FileSearch, Eye, EyeOff, Plus, Loader2, User, FileDown, Star, Trash2,
  ExternalLink, File
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PublicContribution, ContributionDocument } from "@/hooks/useVINData";

// ── Signal Proofs ──
function SignalProofs({ contributionIds, allContributions }: { contributionIds: string[]; allContributions: PublicContribution[] }) {
  const matched = allContributions.filter((c) => contributionIds.includes(c.id));
  if (matched.length === 0) {
    return <p className="text-xs text-muted-foreground px-3 pb-3">Aucune preuve accessible.</p>;
  }
  return (
    <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
      {matched.map((c) => (
        <div key={c.id} className="p-2 rounded-md bg-muted/50 text-xs space-y-1">
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
      <div className="flex gap-1 mt-2">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleAdminAction(contributionId, "hide"); }}>
          <EyeOff className="w-3 h-3 mr-1" /> Masquer
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-danger" onClick={(e) => { e.stopPropagation(); handleAdminAction(contributionId, "delete"); }}>
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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-16">
          <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Chargement du dossier...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-16">
          <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center min-h-[50vh]">
            <AlertTriangle className="w-8 h-8 text-danger mb-3" />
            <p className="text-sm text-muted-foreground">Erreur de chargement.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // VIN not found
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-16">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Link to="/" className="hover:text-foreground">Accueil</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-mono">{vin}</span>
            </div>
            <VehicleIdentificationCard vin={vin || ""} vinDecode={vinDecode} isLoading={isDecodingVIN} />
            <div className="p-6 rounded-lg bg-card border border-border shadow-card text-center">
              <h2 className="font-display text-lg font-bold mb-1">Ce VIN n'a pas encore de dossier</h2>
              <p className="text-sm text-muted-foreground mb-4">Chaque contribution utile peut aider le prochain acheteur.</p>
              <Button size="default" onClick={handleContributeClick}>
                <Plus className="w-4 h-4 mr-1" />
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
    { icon: FileText, value: contributions.length, label: "Contributions" },
    { icon: FileSearch, value: totalDocs, label: "Documents" },
    { icon: Camera, value: totalPhotos, label: "Photos" },
    { icon: AlertTriangle, value: observedSignals.length, label: "Signaux" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-16 pb-12 flex-1">
        <div className="max-w-4xl mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <Link to="/" className="hover:text-foreground">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-mono">{vin}</span>
          </div>

          {/* A. Vehicle Header */}
          <VehicleIdentificationCard vin={vin || ""} vinDecode={vinDecode} isLoading={isDecodingVIN} lastUpdated={data.lastUpdated} />

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Button size="sm" onClick={handleContributeClick}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter une contribution
            </Button>
            {data.totalContributions > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowPDFDialog(true)}>
                <FileDown className="w-4 h-4 mr-1" />
                Rapport PDF
              </Button>
            )}
            <Button variant={isFollowing ? "secondary" : "outline"} size="sm" onClick={handleFollowClick} disabled={isFollowLoading}>
              <Star className={`w-4 h-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />
              {isFollowing ? "Suivi" : "Suivre"}
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" asChild className="text-primary border-primary/20">
                <Link to="/admin/contributions"><Shield className="w-4 h-4 mr-1" /> Modérer</Link>
              </Button>
            )}
          </div>

          {/* Owner status */}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'verified' && (
            <div className="mb-4 p-3 rounded-md bg-success/5 border border-success/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-success" /><span className="text-success font-medium">Propriétaire vérifié</span></div>
              <button onClick={handleEndOwnership} disabled={isEndingOwnership} className="text-xs text-muted-foreground hover:text-foreground underline">
                {isEndingOwnership ? <Loader2 className="w-3 h-3 animate-spin" /> : "Révoquer"}
              </button>
            </div>
          )}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'pending' && (
            <div className="mb-4 p-3 rounded-md bg-warning/5 border border-warning/20 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-warning" /><span className="text-warning">Vérification en cours</span>
            </div>
          )}

          {/* B. Stats tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {statTiles.map((t, i) => (
              <div key={i} className="p-4 rounded-lg bg-card border border-border shadow-card text-center">
                <t.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <span className="font-display text-xl font-bold text-foreground block">{t.value}</span>
                <span className="text-xs text-muted-foreground">{t.label}</span>
              </div>
            ))}
          </div>

          {/* C. Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start bg-card border border-border rounded-lg h-auto p-1 flex-wrap">
              <TabsTrigger value="overview" className="text-sm">Aperçu</TabsTrigger>
              <TabsTrigger value="timeline" className="text-sm">Chronologie</TabsTrigger>
              <TabsTrigger value="documents" className="text-sm">Documents{totalDocs > 0 && ` (${totalDocs})`}</TabsTrigger>
              <TabsTrigger value="photos" className="text-sm">Photos{totalPhotos > 0 && ` (${totalPhotos})`}</TabsTrigger>
            </TabsList>

            {/* ── Aperçu ── */}
            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* Latest contributions */}
              {contributions.length > 0 && (
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground mb-3">Derniers éléments ajoutés</h3>
                  <div className="space-y-3">
                    {contributions.slice(0, 3).map(c => (
                      <ContributionCard key={c.id} contribution={c} compact adminActions={<AdminActions contributionId={c.id} />} />
                    ))}
                  </div>
                  {contributions.length > 3 && (
                    <button onClick={() => { const el = document.querySelector('[data-value="timeline"]') as HTMLElement; el?.click(); }} className="text-xs text-primary hover:underline mt-2 block">
                      Voir toute la chronologie →
                    </button>
                  )}
                </div>
              )}

              {/* Observed signals */}
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> Signaux observés
                </h3>
                <div className="rounded-lg bg-card border border-border shadow-card p-4">
                  <p className="text-xs text-muted-foreground mb-3">Faits rapportés par les contributeurs.</p>
                  {observedSignals.length > 0 ? (
                    <div className="space-y-2">
                      {observedSignals.map(signal => {
                        const lastMonth = signal.lastObserved ? new Date(signal.lastObserved).toLocaleDateString("fr-CA", { month: "short", year: "numeric" }) : null;
                        const isExpanded = expandedSignalId === signal.id;
                        return (
                          <div key={signal.id} className="rounded-md bg-muted/30 border border-border overflow-hidden">
                            <button onClick={() => setExpandedSignalId(isExpanded ? null : signal.id)} className="w-full flex items-start gap-2 p-3 text-left hover:bg-muted/50 transition-colors">
                              <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-foreground">{signal.text}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground">{signal.count} contribution{signal.count > 1 ? "s" : ""}</span>
                                  {lastMonth && <span className="text-xs text-muted-foreground">· {lastMonth}</span>}
                                </div>
                              </div>
                              <span className="text-xs text-primary shrink-0">{isExpanded ? "Masquer" : "Preuves"}</span>
                            </button>
                            {isExpanded && <SignalProofs contributionIds={signal.contributionIds} allContributions={contributions} />}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">Aucun signal observé.</p>
                  )}
                </div>
              </div>

              {/* Recent documents */}
              {allDocuments.length > 0 && (
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground mb-3">Documents récents</h3>
                  <div className="space-y-2">
                    {allDocuments.slice(0, 3).map(doc => (
                      <DocRow key={doc.id} doc={doc} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent photos */}
              {allPhotos.length > 0 && (
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground mb-3">Photos récentes</h3>
                  <PhotoGallery photos={allPhotos.slice(0, 6)} />
                </div>
              )}

              {/* Contribute CTA */}
              {contributions.length === 0 && (
                <div className="p-6 rounded-lg border border-dashed border-primary/20 bg-accent/30 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Aucune contribution pour ce véhicule. Chaque contribution utile peut aider le prochain acheteur.</p>
                  <Button size="sm" onClick={handleContributeClick}>
                    <Plus className="w-4 h-4 mr-1" /> Ajouter une contribution
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── Chronologie ── */}
            <TabsContent value="timeline" className="mt-4">
              {/* Filters */}
              {allContributionTypes.length > 2 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {allContributionTypes.map(t => (
                    <button key={t.type} onClick={() => setFilterType(t.type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterType === t.type ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"}`}>
                      {t.label} ({t.count})
                    </button>
                  ))}
                </div>
              )}
              {filteredContributions.length > 0 ? (
                <div className="space-y-3">
                  {filteredContributions.map(c => (
                    <ContributionCard key={c.id} contribution={c} adminActions={<AdminActions contributionId={c.id} />} />
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-lg bg-card border border-border text-center">
                  <p className="text-sm text-muted-foreground">Aucune contribution pour ce filtre.</p>
                </div>
              )}
            </TabsContent>

            {/* ── Documents ── */}
            <TabsContent value="documents" className="mt-4">
              {allDocuments.length > 0 ? (
                <div className="space-y-2">
                  {allDocuments.map(doc => <DocRow key={doc.id} doc={doc} />)}
                </div>
              ) : (
                <div className="p-8 rounded-lg bg-card border border-border text-center">
                  <p className="text-sm text-muted-foreground">Aucun document disponible.</p>
                </div>
              )}
            </TabsContent>

            {/* ── Photos ── */}
            <TabsContent value="photos" className="mt-4">
              {allPhotos.length > 0 ? (
                <PhotoGallery photos={allPhotos} />
              ) : (
                <div className="p-8 rounded-lg bg-card border border-border text-center">
                  <p className="text-sm text-muted-foreground">Aucune photo disponible.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Owner claim link */}
          {!isCheckingOwner && currentUserId && ownerVerificationStatus === 'none' && (
            <div className="mt-6 text-center">
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
    <button onClick={handleOpen} disabled={!doc.filePath}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border shadow-card text-left hover:border-primary/20 transition-colors group">
      <File className="w-4 h-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {doc.description && <span>{doc.description}</span>}
          {doc.fileSize && <span>{(doc.fileSize / 1024).toFixed(0)} Ko</span>}
        </div>
      </div>
      <Badge variant="outline" className="text-[10px]">{doc.fileType?.split("/").pop()?.toUpperCase() || "DOC"}</Badge>
      {doc.filePath && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />}
    </button>
  );
}

export default VINDetail;
