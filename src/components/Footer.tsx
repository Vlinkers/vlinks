import { Link } from "react-router-dom";
import vlinksIcon from "@/assets/vlinks-icon.svg";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={vlinksIcon} alt="VLINKS" className="h-6 w-auto" />
              <span className="font-display font-bold text-sm text-foreground">VLINKS</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/how-it-works" className="hover:text-foreground transition-colors">Comment ça marche</Link>
              <Link to="/why" className="hover:text-foreground transition-colors">Pourquoi VLINKS</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Tarifs</Link>
            </nav>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <p>© {new Date().getFullYear()} VLINKS · Fait au Québec 🍁</p>
            <nav className="flex items-center gap-2 mt-1 justify-end">
              <Link to="/conditions-utilisation" className="hover:text-foreground transition-colors">Conditions d'utilisation</Link>
              <span>|</span>
              <Link to="/politique-confidentialite" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
              <span>|</span>
              <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
