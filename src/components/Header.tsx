import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, X, LogOut, User, Search, Shield, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { NotificationBell } from "@/components/NotificationBell";
import vlinksIcon from "@/assets/vlinks-icon.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = ({ hideSearch = false, transparent = false }: { hideSearch?: boolean; transparent?: boolean }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [vinSearch, setVinSearch] = useState("");
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const isVINPage = location.pathname.startsWith("/vin/");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleVinSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (vinSearch.trim()) {
      navigate(`/vin/${vinSearch.trim().toUpperCase()}`);
      setVinSearch("");
      setIsMenuOpen(false);
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 h-14 transition-colors duration-300 ${
      transparent ? "bg-transparent border-b border-white/10" : "bg-card border-b border-border"
    }`}>
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={vlinksIcon} alt="VLINKS" className="h-7 w-auto" />
          <span className={`font-display font-bold text-lg hidden sm:block ${transparent ? "text-white" : "text-foreground"}`}>VLINKS</span>
        </Link>

        {/* VIN Search — hidden on homepage when hero is visible */}
        <form
          onSubmit={handleVinSearch}
          className={`hidden md:flex items-center flex-1 max-w-md ml-4 transition-opacity duration-300 ${
            hideSearch ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un VIN..."
              value={vinSearch}
              onChange={(e) => setVinSearch(e.target.value.toUpperCase())}
              className="pl-9 h-9 text-sm font-mono bg-muted/50 border-border focus:border-primary"
              maxLength={17}
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          {!isVINPage && (
            <Button variant="default" size="sm" onClick={() => navigate(user ? "/" : "/auth")}>
              <Plus className="w-4 h-4 mr-1" />
              Contribuer
            </Button>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={`gap-2 ${transparent ? "text-white hover:bg-white/10" : ""}`}>
                  <User className="w-4 h-4" />
                  <span className="hidden lg:inline">Mon compte</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="w-4 h-4" />
                      Administration
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-danger cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild className={transparent ? "text-white hover:bg-white/10" : ""}>
              <Link to="/auth">Connexion</Link>
            </Button>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className={`md:hidden p-2 ml-auto ${transparent ? "text-white" : "text-foreground"}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Menu"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 pb-4 animate-fade-in-up">
          <form onSubmit={handleVinSearch} className="flex items-center gap-2 py-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un VIN..."
                value={vinSearch}
                onChange={(e) => setVinSearch(e.target.value.toUpperCase())}
                className="pl-9 h-10 text-sm font-mono"
                maxLength={17}
              />
            </div>
            <Button type="submit" size="sm">
              <Search className="w-4 h-4" />
            </Button>
          </form>
          <div className="flex flex-col gap-1">
            <Link to="/how-it-works" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50" onClick={() => setIsMenuOpen(false)}>
              Comment ça marche
            </Link>
            <Link to="/why" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50" onClick={() => setIsMenuOpen(false)}>
              Pourquoi VLINKS
            </Link>
            {user ? (
              <>
                <Link to="/profile" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50" onClick={() => setIsMenuOpen(false)}>
                  Profil
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="px-3 py-2 text-sm text-primary hover:bg-accent rounded-md" onClick={() => setIsMenuOpen(false)}>
                    Administration
                  </Link>
                )}
                <button onClick={() => { handleSignOut(); setIsMenuOpen(false); }} className="px-3 py-2 text-sm text-danger text-left rounded-md hover:bg-danger/5">
                  Déconnexion
                </button>
              </>
            ) : (
              <Link to="/auth" className="px-3 py-2 text-sm text-primary font-medium rounded-md hover:bg-accent" onClick={() => setIsMenuOpen(false)}>
                Connexion
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
