import { Link } from "react-router-dom";
import { Shield, Github, Twitter, Linkedin, Mail } from "lucide-react";

const footerLinks = {
  product: {
    title: "Produit",
    links: [
      { label: "Recherche VIN", href: "/search" },
      { label: "Rapports Premium", href: "/premium" },
      { label: "Marketplace Inspecteurs", href: "/inspectors" },
      { label: "Tarifs", href: "/pricing" },
    ],
  },
  community: {
    title: "Communauté",
    links: [
      { label: "Contribuer", href: "/contribute" },
      { label: "Programme Ambassadeurs", href: "/ambassadors" },
      { label: "Forum", href: "/forum" },
      { label: "Blog", href: "/blog" },
    ],
  },
  company: {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "/about" },
      { label: "Carrières", href: "/careers" },
      { label: "Presse", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
  },
  legal: {
    title: "Légal",
    links: [
      { label: "Confidentialité", href: "/privacy" },
      { label: "Conditions d'utilisation", href: "/terms" },
      { label: "Politique cookies", href: "/cookies" },
      { label: "RGPD", href: "/gdpr" },
    ],
  },
};

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            <span className="font-display text-xl font-bold">
                <span className="text-gradient">V</span>
                <span className="text-foreground">LINKS</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Truth is a chain. You are the link.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              <a
                href="#"
                className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="mailto:contact@vlinks.com"
                className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 VLINKS. Tous droits réservés.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Fait avec</span>
            <span className="text-danger">❤️</span>
            <span>au Québec</span>
            <span className="text-primary">🍁</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
