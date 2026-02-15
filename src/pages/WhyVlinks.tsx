import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import {
  Users,
  Link as LinkIcon,
  Shield,
  Eye,
  Car,
  Heart,
  Sparkles,
  Network,
  Building2,
  Brain,
  Infinity,
  Lock,
} from "lucide-react";

const WhyVlinks = () => {
  const problems = [
    {
      title: "Inspections coûteuses",
      description: "Un coût important que chaque acheteur paie, souvent pour découvrir les mêmes problèmes que le précédent.",
    },
    {
      title: "Informations qui disparaissent",
      description: "L'inspection révèle des problèmes, l'achat est abandonné. Cette information précieuse disparaît. Le prochain acheteur repaiera pour la même découverte.",
    },
    {
      title: "Acheteurs isolés",
      description: "Chaque acheteur repart de zéro, sans accès aux expériences des précédents intéressés. L'information existe, mais elle n'est pas partagée.",
    },
  ];

  const differences = [
    {
      icon: Building2,
      title: "Indépendance totale",
      description: "Aucun lien avec les concessionnaires, les assureurs ou les plateformes d'annonces. Notre seule loyauté : les acheteurs.",
    },
    {
      icon: Brain,
      title: "Intelligence collective",
      description: "Plus la communauté grandit, plus chaque dossier devient complet. Ensemble, nous voyons ce qu'aucun acheteur seul ne pourrait voir.",
    },
    {
      icon: Infinity,
      title: "Continuité de l'information",
      description: "Les données ne disparaissent pas. Chaque contribution enrichit le dossier pour toujours.",
    },
    {
      icon: Heart,
      title: "Bien commun, pas extraction",
      description: "Nous ne revendons pas vos données. Nous créons un espace où chacun donne et reçoit.",
    },
  ];

  const protections = [
    {
      icon: Lock,
      title: "Anonymisation",
      description: "Vos informations personnelles sont automatiquement masquées.",
    },
    {
      icon: Shield,
      title: "Modération",
      description: "Chaque contribution est vérifiée pour éviter les accusations injustes.",
    },
    {
      icon: Eye,
      title: "Contributions directes",
      description: "Les contributions sont publiées telles que soumises par leurs auteurs.",
    },
  ];

  return (
    <>
      <SEO 
        title="Pourquoi VLINKS - Notre mission"
        description="VLINKS résout le problème des inspections coûteuses et des informations perdues. Découvrez notre philosophie communautaire pour un marché automobile plus transparent."
        canonical="https://vlinks.ca/why"
      />
      <div className="min-h-screen bg-background">
        <Header />

        {/* Spacer for header */}
        <div className="pt-24 md:pt-32" />

        {/* Section 1 — Le problème fondamental */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Le problème que <span className="text-gradient">personne ne résout</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Le marché de l'occasion est brisé. L'information existe, mais elle disparaît. 
                Et chaque nouvel acheteur paie le prix de cette opacité.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {problems.map((problem, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-background border border-border/50"
                >
                  <h3 className="font-display text-lg font-semibold mb-3">{problem.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{problem.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2 — La vérité est une chaîne */}
        <section className="py-16 md:py-24 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                <Network className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Notre conviction</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                La vérité est une <span className="text-gradient">chaîne</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                La vérité sur un véhicule ne se trouve jamais dans un seul document. 
                Elle émerge de l'addition des expériences individuelles.
              </p>
            </div>

            {/* Visual Chain Metaphor */}
            <div className="relative max-w-4xl mx-auto mb-12">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />
              
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: "Votre inspection", icon: Eye },
                  { label: "Son expérience", icon: Users },
                  { label: "Leur avis", icon: Heart },
                  { label: "Nos photos", icon: Car },
                  { label: "La vérité", icon: Sparkles },
                ].map((item, index) => (
                  <div key={index} className="relative group">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center mb-2 group-hover:border-primary transition-all">
                        <item.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      </div>
                      <p className="text-xs md:text-sm font-medium text-center">{item.label}</p>
                    </div>
                    {index < 4 && (
                      <div className="hidden md:block absolute top-7 -right-2 z-10">
                        <LinkIcon className="w-4 h-4 text-primary/50" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-2xl mx-auto text-center">
              <p className="text-muted-foreground">
                Chaque expérience partagée est un maillon. Plus il y a de maillons, plus l'image est complète.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 — Pourquoi VLINKS est différent */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Pourquoi VLINKS est <span className="text-gradient">différent</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {differences.map((diff, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-background border border-border/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <diff.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold mb-2">{diff.title}</h3>
                      <p className="text-muted-foreground text-sm">{diff.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — Transparence ne veut pas dire anarchie */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Transparence ne veut pas dire <span className="text-gradient">anarchie</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                VLINKS protège les contributeurs, les acheteurs, et les vendeurs honnêtes.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 max-w-3xl mx-auto">
              {protections.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-5 py-3 rounded-full bg-background border border-border/50"
                >
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">{item.title}</span>
                    <span className="text-muted-foreground text-sm"> · {item.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5 — Appel moral à contribution */}
        <section className="py-16 md:py-24 bg-gradient-hero relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Si vous avez déjà payé pour la vérité,{" "}
                <span className="text-gradient">ne la laissez pas disparaître</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-3">
                Devenez un maillon de la chaîne.
              </p>
              <p className="text-muted-foreground mb-10">
                Aidez le prochain acheteur à voir clair.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/auth" className="gap-2">
                    <Users className="w-5 h-5" />
                    Contribuer maintenant
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="bg-background/10 border-border/30 hover:bg-background/20">
                  <Link to="/" className="gap-2">
                    Rechercher un VIN
                  </Link>
                </Button>
              </div>

              <p className="font-display text-xl md:text-2xl font-medium text-primary">
                « La vérité est une chaîne. Vous êtes le maillon. »
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default WhyVlinks;
