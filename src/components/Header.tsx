import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, LogOut, User, Home, BookOpen, CreditCard, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { label: "Accueil", href: "/", icon: Home },
    { label: "Comment ça marche", href: "/how-it-works", icon: BookOpen },
    { label: "Tarifs", href: "/pricing", icon: CreditCard },
    { label: "Pourquoi VLINKS", href: "/why", icon: Heart },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Shield className="w-8 h-8 md:w-10 md:h-10 text-primary transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-display text-xl md:text-2xl font-bold">
              <span className="text-gradient">V</span>
              <span className="text-foreground">LINKS</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    {user.email?.split('@')[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      Mon profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-danger cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">Connexion</Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/auth">Contribuer</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in-up">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border/50">
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="w-5 h-5" />
                      Mon profil
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="justify-start text-danger"
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Déconnexion
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                        Connexion
                      </Link>
                    </Button>
                    <Button variant="hero" className="justify-start" asChild>
                      <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                        Contribuer
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
