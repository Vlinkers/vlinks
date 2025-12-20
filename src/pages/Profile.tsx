import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, FileText, LogOut, Calendar, Trash2, Eye, Loader2, AlertCircle, Car, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
  points: number;
  level: number;
  contributions_count: number;
}

interface UserContribution {
  id: string;
  vin: string;
  vin_id: string;
  contribution_type: string;
  created_at: string;
  processing_status: string;
  summary_public: string | null;
  is_owner_contribution: boolean;
  publishable: boolean;
}

interface OwnerClaim {
  id: string;
  vin_id: string;
  vin: string;
  status: string;
  created_at: string;
  verified_at: string | null;
}

const CONTRIBUTION_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  inspection_report: { fr: "Rapport d'inspection", en: "Inspection Report" },
  vehicle_history: { fr: "Historique véhicule", en: "Vehicle History" },
  owner_exchange: { fr: "Échange avec le propriétaire", en: "Owner Exchange" },
  mechanic_conversation: { fr: "Discussion mécanicien", en: "Mechanic Discussion" },
  photo_evidence: { fr: "Photos/Preuves", en: "Photo Evidence" },
  observation: { fr: "Observation", en: "Observation" },
  purchase_decision: { fr: "Décision d'achat", en: "Purchase Decision" },
};

const Profile = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [contributions, setContributions] = useState<UserContribution[]>([]);
  const [ownerClaims, setOwnerClaims] = useState<OwnerClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [deleteContributionId, setDeleteContributionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revokeClaimId, setRevokeClaimId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterVin, setFilterVin] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch profile, contributions and claims
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchContributions();
      fetchOwnerClaims();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      // If no profile, it will be created on first signup
    } else if (data) {
      setProfile(data);
      // Generate default username if not set
      if (!data.username) {
        const defaultUsername = `Membre-${Math.floor(1000 + Math.random() * 9000)}`;
        setUsername(defaultUsername);
      } else {
        setUsername(data.username);
      }
    }
    setLoading(false);
  };

  const fetchContributions = async () => {
    if (!user) return;

    // Fetch from public_contributions (published) + raw_contributions (for status)
    // We need a combined view - using raw_contributions for status tracking
    const { data: rawData, error: rawError } = await supabase
      .from("raw_contributions")
      .select(`
        id,
        vin_id,
        contribution_type,
        created_at,
        processing_status,
        is_owner_contribution,
        vins!inner(vin)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (rawError) {
      console.error("Error fetching raw contributions:", rawError);
      return;
    }

    // Fetch corresponding public contributions
    const { data: publicData, error: publicError } = await supabase
      .from("public_contributions")
      .select("raw_contribution_id, summary_public, publishable")
      .eq("user_id", user.id);

    if (publicError) {
      console.error("Error fetching public contributions:", publicError);
    }

    // Create a map of raw_contribution_id to public data
    const publicMap = new Map(
      (publicData || []).map(p => [p.raw_contribution_id, p])
    );

    // Combine the data
    const combined: UserContribution[] = (rawData || []).map((raw: any) => {
      const pub = publicMap.get(raw.id);
      return {
        id: raw.id,
        vin: raw.vins?.vin || "N/A",
        vin_id: raw.vin_id,
        contribution_type: raw.contribution_type,
        created_at: raw.created_at,
        processing_status: raw.processing_status,
        summary_public: pub?.summary_public || null,
        is_owner_contribution: raw.is_owner_contribution || false,
        publishable: pub?.publishable || false,
      };
    });

    setContributions(combined);
  };

  const fetchOwnerClaims = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("owner_claims")
      .select(`
        id,
        vin_id,
        status,
        created_at,
        verified_at,
        vins!inner(vin)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching owner claims:", error);
      return;
    }

    const claims: OwnerClaim[] = (data || []).map((claim: any) => ({
      id: claim.id,
      vin_id: claim.vin_id,
      vin: claim.vins?.vin || "N/A",
      status: claim.status,
      created_at: claim.created_at,
      verified_at: claim.verified_at,
    }));

    setOwnerClaims(claims);
  };

  const handleRevokeClaim = async (claimId: string) => {
    setRevokingId(claimId);

    const { error } = await supabase
      .from("owner_claims")
      .update({ 
        status: "revoked", 
        revoked_at: new Date().toISOString() 
      })
      .eq("id", claimId)
      .eq("user_id", user?.id);

    setRevokingId(null);
    setRevokeClaimId(null);

    if (error) {
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Impossible de révoquer le claim" 
          : "Failed to revoke claim",
        variant: "destructive",
      });
    } else {
      toast({
        title: language === "fr" ? "Révoqué" : "Revoked",
        description: language === "fr" 
          ? "Votre revendication a été révoquée" 
          : "Your claim has been revoked",
      });
      fetchOwnerClaims();
    }
  };

  const validateUsername = (value: string): boolean => {
    if (value.length < 3 || value.length > 20) {
      setUsernameError(language === "fr" 
        ? "Le pseudonyme doit contenir entre 3 et 20 caractères" 
        : "Username must be between 3 and 20 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError(language === "fr" 
        ? "Lettres, chiffres et underscores uniquement" 
        : "Letters, numbers, and underscores only");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const checkUsernameAvailability = async (value: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", value)
      .neq("user_id", user?.id || "")
      .single();

    if (data) {
      setUsernameError(language === "fr" 
        ? "Ce pseudonyme est déjà pris" 
        : "This username is already taken");
      return false;
    }
    return true;
  };

  const handleSaveUsername = async () => {
    if (!user || !validateUsername(username)) return;
    
    setSaving(true);
    
    const isAvailable = await checkUsernameAvailability(username);
    if (!isAvailable) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Impossible de sauvegarder le pseudonyme" 
          : "Failed to save username",
        variant: "destructive",
      });
    } else {
      toast({
        title: language === "fr" ? "Sauvegardé" : "Saved",
        description: language === "fr" 
          ? "Votre pseudonyme a été mis à jour" 
          : "Your username has been updated",
      });
      fetchProfile();
    }
  };

  const handleDeleteContribution = async (contributionId: string) => {
    setDeletingId(contributionId);
    
    // Soft delete: update processing_status to 'deleted'
    const { error: rawError } = await supabase
      .from("raw_contributions")
      .update({ processing_status: "deleted" })
      .eq("id", contributionId)
      .eq("user_id", user?.id);

    // Also mark public_contribution as not publishable
    const { error: pubError } = await supabase
      .from("public_contributions")
      .update({ publishable: false })
      .eq("raw_contribution_id", contributionId);

    setDeletingId(null);
    setDeleteContributionId(null);

    if (rawError) {
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Impossible de supprimer la contribution" 
          : "Failed to delete contribution",
        variant: "destructive",
      });
    } else {
      toast({
        title: language === "fr" ? "Supprimée" : "Deleted",
        description: language === "fr" 
          ? "Votre contribution a été retirée" 
          : "Your contribution has been removed",
      });
      fetchContributions();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string, publishable: boolean) => {
    if (status === "deleted") {
      return <Badge variant="destructive">{language === "fr" ? "Supprimée" : "Deleted"}</Badge>;
    }
    if (status === "failed") {
      return <Badge variant="destructive">{language === "fr" ? "Échec analyse" : "Analysis Failed"}</Badge>;
    }
    if (status === "pending" || status === "processing") {
      return <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">{language === "fr" ? "En analyse" : "Processing"}</Badge>;
    }
    if (status === "completed" && publishable) {
      return <Badge variant="default" className="bg-green-500/20 text-green-600">{language === "fr" ? "Publiée" : "Published"}</Badge>;
    }
    if (status === "completed" && !publishable) {
      return <Badge variant="secondary">{language === "fr" ? "Non publiée" : "Not Published"}</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const filteredContributions = contributions.filter(c => {
    if (filterType !== "all" && c.contribution_type !== filterType) return false;
    if (filterVin && !c.vin.toLowerCase().includes(filterVin.toLowerCase())) return false;
    if (c.processing_status === "deleted") return false; // Hide deleted
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <SEO
        title={language === "fr" ? "Mon profil | VLINKS" : "My Profile | VLINKS"}
        description={language === "fr" ? "Gérez votre profil et vos contributions VLINKS" : "Manage your VLINKS profile and contributions"}
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-display font-bold mb-8">
              {language === "fr" ? "Mon profil" : "My Profile"}
            </h1>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {language === "fr" ? "Profil" : "Profile"}
                </TabsTrigger>
                <TabsTrigger value="contributions" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {language === "fr" ? "Contributions" : "Contributions"}
                </TabsTrigger>
                <TabsTrigger value="claims" className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  {language === "fr" ? "Mes VIN" : "My VINs"}
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "fr" ? "Informations du compte" : "Account Information"}</CardTitle>
                    <CardDescription>
                      {language === "fr" 
                        ? "Gérez vos informations personnelles" 
                        : "Manage your personal information"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Email (read-only) */}
                    <div className="space-y-2">
                      <Label>{language === "fr" ? "Email" : "Email"}</Label>
                      <Input 
                        value={user.email || ""} 
                        disabled 
                        className="bg-muted/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" 
                          ? "L'email ne peut pas être modifié" 
                          : "Email cannot be changed"}
                      </p>
                    </div>

                    {/* Username (editable) */}
                    <div className="space-y-2">
                      <Label>{language === "fr" ? "Pseudonyme" : "Username"}</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            validateUsername(e.target.value);
                          }}
                          placeholder={language === "fr" ? "Votre pseudonyme" : "Your username"}
                          className={usernameError ? "border-destructive" : ""}
                        />
                        <Button 
                          onClick={handleSaveUsername}
                          disabled={saving || !!usernameError || username === profile?.username}
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            language === "fr" ? "Sauvegarder" : "Save"
                          )}
                        </Button>
                      </div>
                      {usernameError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {usernameError}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {language === "fr" 
                          ? "3-20 caractères, lettres, chiffres et underscores uniquement" 
                          : "3-20 characters, letters, numbers, and underscores only"}
                      </p>
                    </div>

                    {/* Registration date */}
                    {profile?.created_at && (
                      <div className="space-y-2">
                        <Label>{language === "fr" ? "Membre depuis" : "Member since"}</Label>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(profile.created_at).toLocaleDateString(
                            language === "fr" ? "fr-CA" : "en-CA",
                            { year: "numeric", month: "long", day: "numeric" }
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{profile?.points || 0}</div>
                        <div className="text-xs text-muted-foreground">{language === "fr" ? "Points" : "Points"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{profile?.level || 1}</div>
                        <div className="text-xs text-muted-foreground">{language === "fr" ? "Niveau" : "Level"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{profile?.contributions_count || 0}</div>
                        <div className="text-xs text-muted-foreground">{language === "fr" ? "Contributions" : "Contributions"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Logout Button */}
                <Button 
                  variant="outline" 
                  className="w-full text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {language === "fr" ? "Se déconnecter" : "Sign Out"}
                </Button>
              </TabsContent>

              {/* Contributions Tab */}
              <TabsContent value="contributions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "fr" ? "Mes contributions" : "My Contributions"}</CardTitle>
                    <CardDescription>
                      {language === "fr" 
                        ? "Consultez et gérez vos contributions" 
                        : "View and manage your contributions"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <Input 
                          placeholder={language === "fr" ? "Filtrer par VIN..." : "Filter by VIN..."}
                          value={filterVin}
                          onChange={(e) => setFilterVin(e.target.value.toUpperCase())}
                          className="font-mono"
                        />
                      </div>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder={language === "fr" ? "Type" : "Type"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{language === "fr" ? "Tous les types" : "All types"}</SelectItem>
                          {Object.entries(CONTRIBUTION_TYPE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {language === "fr" ? label.fr : label.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Contributions List */}
                    {filteredContributions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{language === "fr" ? "Aucune contribution trouvée" : "No contributions found"}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredContributions.map((contribution) => (
                          <div 
                            key={contribution.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="text-sm font-mono text-primary">{contribution.vin}</code>
                                <Badge variant="outline" className="text-xs">
                                  {CONTRIBUTION_TYPE_LABELS[contribution.contribution_type]?.[language] || contribution.contribution_type}
                                </Badge>
                                {contribution.is_owner_contribution && (
                                  <Badge variant="secondary" className="text-xs">
                                    {language === "fr" ? "Propriétaire" : "Owner"}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(contribution.created_at).toLocaleDateString(
                                    language === "fr" ? "fr-CA" : "en-CA"
                                  )}
                                </span>
                                {getStatusBadge(contribution.processing_status, contribution.publishable)}
                              </div>
                              {contribution.summary_public && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {contribution.summary_public}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/vin/${contribution.vin}`)}
                                title={language === "fr" ? "Voir" : "View"}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteContributionId(contribution.id)}
                                title={language === "fr" ? "Supprimer" : "Delete"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Owner Claims Tab */}
              <TabsContent value="claims" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      {language === "fr" ? "Mes VIN revendiqués" : "My Claimed VINs"}
                    </CardTitle>
                    <CardDescription>
                      {language === "fr" 
                        ? "Gérez vos revendications de propriété (beta)" 
                        : "Manage your ownership claims (beta)"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ownerClaims.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{language === "fr" ? "Aucun VIN revendiqué" : "No claimed VINs"}</p>
                        <p className="text-sm mt-2">
                          {language === "fr" 
                            ? "Vous pouvez revendiquer un VIN depuis sa page de détails." 
                            : "You can claim a VIN from its details page."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ownerClaims.map((claim) => (
                          <div 
                            key={claim.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="text-sm font-mono text-primary">{claim.vin}</code>
                                {claim.status === "active" ? (
                                  <Badge variant="default" className="bg-green-500/20 text-green-600">
                                    {language === "fr" ? "Actif" : "Active"}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    {language === "fr" ? "Révoqué" : "Revoked"}
                                  </Badge>
                                )}
                                {claim.verified_at && (
                                  <Badge variant="outline" className="text-xs">
                                    {language === "fr" ? "Vérifié" : "Verified"}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(claim.created_at).toLocaleDateString(
                                    language === "fr" ? "fr-CA" : "en-CA"
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/vin/${claim.vin}`)}
                                title={language === "fr" ? "Voir" : "View"}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {claim.status === "active" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setRevokeClaimId(claim.id)}
                                  title={language === "fr" ? "Révoquer" : "Revoke"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteContributionId} onOpenChange={() => setDeleteContributionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {language === "fr" ? "Supprimer cette contribution ?" : "Delete this contribution?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {language === "fr" 
                  ? "Cette action retirera votre contribution de la page VIN. Cette action est irréversible." 
                  : "This will remove your contribution from the VIN page. This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {language === "fr" ? "Annuler" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteContributionId && handleDeleteContribution(deleteContributionId)}
                disabled={!!deletingId}
              >
                {deletingId ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {language === "fr" ? "Supprimer" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Revoke Claim Confirmation Dialog */}
        <AlertDialog open={!!revokeClaimId} onOpenChange={() => setRevokeClaimId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {language === "fr" ? "Révoquer cette revendication ?" : "Revoke this claim?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {language === "fr" 
                  ? "Cette action indiquera que vous n'êtes plus le propriétaire de ce véhicule. Vous pourrez revendiquer à nouveau plus tard si nécessaire." 
                  : "This will indicate that you are no longer the owner of this vehicle. You can claim it again later if needed."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {language === "fr" ? "Annuler" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => revokeClaimId && handleRevokeClaim(revokeClaimId)}
                disabled={!!revokingId}
              >
                {revokingId ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {language === "fr" ? "Révoquer" : "Revoke"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default Profile;
