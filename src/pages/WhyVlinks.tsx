import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import {
  Search,
  DollarSign,
  Eye,
  EyeOff,
  Users,
  Link as LinkIcon,
  Shield,
  Heart,
  Award,
  BadgeCheck,
  ArrowRight,
  CircleDollarSign,
  FileX,
  Car,
  UserX,
  Lock,
  Scale,
  Sparkles,
  Network,
  HandHeart,
} from "lucide-react";

const WhyVlinks = () => {
  const [vin, setVin] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (vin.trim()) {
      navigate(`/vin/${vin.trim()}`);
    }
  };

  const problems = [
    {
      icon: CircleDollarSign,
      title: "Inspections coûteuses",
      description: "250$ à 550$ par inspection. Un coût majeur, souvent répété pour le même véhicule par différents acheteurs.",
    },
    {
      icon: EyeOff,
      title: "Informations qui disparaissent",
      description: "L'inspection révèle des problèmes, l'achat est abandonné. Cette information précieuse est perdue à jamais.",
    },
    {
      icon: UserX,
      title: "Acheteurs isolés",
      description: "Chaque acheteur repart de zéro, sans accès aux expériences des précédents intéressés.",
    },
    {
      icon: FileX,
      title: "Même véhicule, plusieurs inspections",
      description: "Le même véhicule problématique peut être inspecté 5, 10 fois par autant d'acheteurs différents.",
    },
    {
      icon: DollarSign,
      title: "Argent gaspillé collectivement",
      description: "Des milliers de dollars dépensés en inspections redondantes pour des véhicules qui ne seront jamais vendus.",
    },
    {
      icon: Scale,
      title: "Vendeurs peu transparents",
      description: "Sans historique partagé, les vendeurs malhonnêtes peuvent continuer à proposer des véhicules problématiques.",
    },
  ];

  const protections = [
    {
      icon: Lock,
      title: "Anonymisation automatique",
      description: "Vos informations personnelles sont automatiquement masquées. Votre contribution reste anonyme.",
    },
    {
      icon: FileX,
      title: "Pas de documents propriétaires",
      description: "Nous ne diffusons jamais les rapports originaux. Seulement des résumés techniques objectifs.",
    },
    {
      icon: Eye,
      title: "Résumés techniques objectifs",
      description: "Des informations factuelles, sans jugement personnel, pour aider les prochains acheteurs.",
    },
    {
      icon: Shield,
      title: "Modération anti-diffamation",
      description: "Chaque contribution est vérifiée pour éviter les accusations injustes ou les informations fausses.",
    },
    {
      icon: BadgeCheck,
      title: "Respect des vendeurs honnêtes",
      description: "Notre système distingue les vendeurs problématiques des professionnels de confiance.",
    },
  ];

  const contributorBenefits = [
    {
      icon: Award,
      title: "Reconnaissance",
      description: "Badges, niveaux et visibilité dans la communauté pour valoriser votre engagement.",
    },
    {
      icon: Sparkles,
      title: "Crédits de contribution",
      description: "Accumulez des crédits échangeables contre des rapports Premium ou des services.",
    },
    {
      icon: HandHeart,
      title: "Partage de revenus équitable",
      description: "Quand vos insights génèrent de la valeur, vous en bénéficiez directement.",
    },
    {
      icon: Heart,
      title: "Remboursement progressif",
      description: "L'objectif : que votre inspection finisse par se rembourser grâce aux contributions des autres.",
    },
  ];

  const differences = [
    {
      title: "Indépendance totale",
      description: "Aucun lien avec les concessionnaires, les assureurs ou les plateformes d'annonces. Notre seule loyauté : les acheteurs.",
    },
    {
      title: "Intelligence collective",
      description: "Plus la communauté grandit, plus chaque dossier devient complet. Ensemble, nous voyons ce qu'aucun acheteur seul ne pourrait voir.",
    },
    {
      title: "Continuité de l'information",
      description: "Les données ne disparaissent pas. Chaque contribution enrichit le dossier pour toujours.",
    },
    {
      title: "Communauté, pas extraction",
      description: "Nous ne revendons pas vos données. Nous créons un bien commun où chacun donne et reçoit.",
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

      {/* Problem Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
              Le problème que <span className="text-gradient">personne ne résout</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Le marché de l'occasion est brisé. L'information existe, mais elle disparaît. 
              Et chaque nouvel acheteur paie le prix de cette opacité.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {problems.map((problem, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-background border border-border/50 hover:border-danger/30 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center mb-4 group-hover:bg-danger/20 transition-colors">
                  <problem.icon className="w-6 h-6 text-danger" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{problem.title}</h3>
                <p className="text-muted-foreground text-sm">{problem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 md:py-32 bg-muted/30 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <Network className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Notre philosophie</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
              La vérité est une <span className="text-gradient">chaîne</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Un document ne dit jamais tout. Mais ensemble, nos expériences forment une image complète.
            </p>
          </div>

          {/* Visual Chain Metaphor */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
              {[
                { label: "Votre inspection", icon: Eye },
                { label: "Son expérience", icon: Users },
                { label: "Leur avis", icon: Heart },
                { label: "Nos photos", icon: Car },
                { label: "La vérité", icon: Sparkles },
              ].map((item, index) => (
                <div key={index} className="relative group">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center mb-3 group-hover:border-primary group-hover:shadow-glow transition-all">
                      <item.icon className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                    </div>
                    <p className="text-sm md:text-base font-medium text-center">{item.label}</p>
                  </div>
                  {index < 4 && (
                    <div className="hidden md:block absolute top-10 -right-3 z-10">
                      <LinkIcon className="w-6 h-6 text-primary/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <p className="text-4xl font-display font-bold text-gradient mb-2">∞</p>
              <p className="text-muted-foreground">Plus il y a de liens, plus l'image est claire</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-display font-bold text-gradient mb-2">1 + 1</p>
              <p className="text-muted-foreground">Chaque expérience enrichit les autres</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-display font-bold text-gradient mb-2">= 3</p>
              <p className="text-muted-foreground">La transparence est collective</p>
            </div>
          </div>
        </div>
      </section>

      {/* Protection Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Protection</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
              VLINKS protège <span className="text-gradient">tout le monde</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Transparence ne veut pas dire anarchie. Nous avons des règles strictes pour protéger 
              les contributeurs, les acheteurs, et même les vendeurs honnêtes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {protections.map((item, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-background border border-border/50 hover:border-success/30 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4 group-hover:bg-success/20 transition-colors">
                  <item.icon className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contributors Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Contributeurs</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                  Votre contribution a de la <span className="text-gradient">valeur</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  VLINKS existe parce que des gens comme vous acceptent de partager. 
                  Cette générosité mérite d'être reconnue et récompensée.
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Vous avez déjà payé</strong> pour cette information. 
                      VLINKS ne vous demande pas de payer à nouveau.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Votre contribution aide</strong> des dizaines d'autres acheteurs 
                      à éviter les mêmes pièges.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">VLINKS répare une injustice</strong> : celle de voir 
                      l'information disparaître après chaque inspection avortée.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {contributorBenefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <benefit.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-muted-foreground text-xs">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Difference Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
              Pourquoi VLINKS est <span className="text-gradient">différent</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Il existe d'autres services. Mais aucun ne fonctionne comme VLINKS.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {differences.map((diff, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-gradient-card border border-border/50 hover:shadow-card transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">{index + 1}</span>
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

      {/* Final CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-hero relative overflow-hidden">
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
            <p className="text-xl text-muted-foreground mb-4">
              Devenez un maillon de la chaîne.
            </p>
            <p className="text-lg text-muted-foreground mb-10">
              Aidez le prochain acheteur à voir clair.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="lg" asChild>
                <Link to="/auth" className="gap-2">
                  <Users className="w-5 h-5" />
                  Contribuer maintenant
                </Link>
              </Button>
              <form onSubmit={handleSearch} className="flex w-full max-w-xs">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="Rechercher un VIN"
                    className="w-full pl-10 pr-4 py-3 rounded-l-lg bg-background/80 border border-border/50 focus:border-primary focus:outline-none transition-all text-sm"
                    maxLength={17}
                  />
                </div>
                <Button type="submit" variant="outline" className="rounded-l-none">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </div>

            <div className="mt-8">
              <Button variant="outline" size="lg" asChild>
                <Link to="/auth" className="gap-2">
                  <Users className="w-5 h-5" />
                  Rejoindre la communauté
                </Link>
              </Button>
            </div>

            <p className="mt-10 text-sm text-muted-foreground">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Truth is a chain. You are the link.
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
