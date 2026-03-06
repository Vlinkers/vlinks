import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Shield, User as UserIcon } from "lucide-react";

interface UserRow {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  contributions_count: number;
  created_at: string;
  role: string;
}

const roleBadge = (role: string) => {
  switch (role) {
    case "admin": return <Badge className="bg-primary/20 text-primary border-primary/30">Admin</Badge>;
    case "moderator": return <Badge className="bg-warning/20 text-warning border-warning/30">Modérateur</Badge>;
    default: return <Badge className="bg-muted text-muted-foreground border-border">Utilisateur</Badge>;
  }
};

export default function AdminUsers() {
  const { logAction } = useAdmin();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, username, display_name, contributions_count, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (profiles) {
      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      setUsers(
        profiles.map((p) => ({
          ...p,
          role: roleMap.get(p.user_id) || "user",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id) {
      toast({ title: "Impossible", description: "Vous ne pouvez pas modifier votre propre rôle", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("user_id", userId);

    if (!error) {
      await logAction("role_changed", "user", userId, { new_role: newRole });
      toast({ title: "Rôle mis à jour" });
      fetchUsers();
    } else {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.user_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Utilisateurs</h1>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contributions</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rôle</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Inscription</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Changer le rôle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.role === "admin" ? <Shield className="w-4 h-4 text-primary" /> : <UserIcon className="w-4 h-4 text-muted-foreground" />}
                      <div>
                        <p className="font-medium">{u.display_name || u.username || "Sans nom"}</p>
                        {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{u.contributions_count}</td>
                  <td className="px-4 py-3">{roleBadge(u.role)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("fr-CA")}</td>
                  <td className="px-4 py-3 text-right">
                    {u.user_id === currentUser?.id ? (
                      <span className="text-xs text-muted-foreground">Vous</span>
                    ) : (
                      <Select value={u.role} onValueChange={(v) => changeRole(u.user_id, v)}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="moderator">Modérateur</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
