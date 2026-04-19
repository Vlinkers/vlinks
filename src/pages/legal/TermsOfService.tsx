import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const TermsOfService = () => {
  return (
    <>
      <SEO
        title="Conditions d'utilisation – VLINKS"
        description="Conditions générales d'utilisation de la plateforme VLINKS, hébergeur de contenu véhiculaire collaboratif."
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-sm text-amber-800">
            Ce document est un modèle et devrait être revu par un conseiller juridique.
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Conditions d'utilisation</h1>
          <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : avril 2026</p>

          <article className="prose prose-neutral max-w-none text-foreground">
            <h2>1. Objet du service</h2>
            <p>
              VLINKS est une plateforme collaborative de documentation véhiculaire. Elle permet aux utilisateurs de contribuer des informations factuelles relatives à l'historique d'un véhicule identifié par son numéro d'identification (VIN).
            </p>
            <p>
              <strong>VLINKS agit en qualité d'hébergeur au sens de la loi.</strong> VLINKS ne produit, ne certifie et ne valide pas le contenu déposé par les utilisateurs. La plateforme met à disposition l'infrastructure technique permettant le dépôt, l'organisation et la consultation des contributions.
            </p>
            <p>
              Les niveaux de preuve (Tier 1 – Déclaration, Tier 2 – Documenté, Tier 3 – Vérifié) reflètent la nature des pièces justificatives fournies par le contributeur. Ils ne constituent en aucun cas un jugement de VLINKS sur la véracité du contenu.
            </p>

            <h2>2. Contributions</h2>
            <p>
              Les utilisateurs sont seuls responsables de la véracité, de l'exactitude et de la licéité de leurs contributions. En soumettant du contenu sur VLINKS, l'utilisateur déclare que les informations fournies sont exactes à sa connaissance.
            </p>
            <p>
              VLINKS ne modifie pas le contenu éditorial des contributions. La modération exercée par VLINKS porte exclusivement sur la conformité aux présentes règles (contenu illicite, haineux, hors sujet) et non sur la véracité des informations.
            </p>
            <p>
              Les contributions soumises de manière anonyme sont conservées avec l'identité réelle du contributeur (non visible publiquement) à des fins de traçabilité et de conformité légale.
            </p>

            <h2>3. Droit de réponse</h2>
            <p>
              Tout propriétaire ou personne concernée par les informations publiées sur un dossier VIN peut exercer un droit de réponse via l'Espace propriétaire.
            </p>
            <p>
              Les réponses du propriétaire sont publiées sans modération éditoriale. Seule la conformité aux règles de la plateforme est vérifiée.
            </p>
            <p>
              Le droit de réponse est structurel : il est intégré dans l'architecture même de la plateforme, garantissant un équilibre entre les contributions de la communauté et la perspective du propriétaire.
            </p>

            <h2>4. Modération</h2>
            <p>
              Toutes les contributions publiées sur la plateforme sont examinées par une équipe humaine avant publication. VLINKS applique une politique de modération neutre et factuelle, sans jugement éditorial sur les véhicules.
            </p>
            <p>
              VLINKS ne garantit pas l'exactitude des informations publiées par les contributeurs. Les utilisateurs sont invités à signaler tout contenu qui leur semble inapproprié via le système de signalement intégré.
            </p>

            <h2>5. Propriété intellectuelle</h2>
            <p>
              Les contributions restent la propriété intellectuelle de leurs auteurs. En publiant du contenu sur VLINKS, l'utilisateur accorde à VLINKS une licence non exclusive, mondiale et gratuite d'affichage, de reproduction et de mise à disposition du contenu dans le cadre du fonctionnement de la plateforme.
            </p>

            <h2>6. Responsabilité</h2>
            <p>
              <strong>VLINKS agit comme hébergeur</strong> et bénéficie du régime de responsabilité allégé prévu par la législation applicable (notamment la LCCJTI au Québec). VLINKS n'est pas responsable du contenu publié par les utilisateurs tant qu'elle n'a pas été informée de son caractère illicite.
            </p>
            <p>
              Toute personne estimant qu'un contenu publié sur VLINKS est illicite peut le signaler via la procédure de signalement. VLINKS s'engage à retirer promptement tout contenu manifestement illicite après notification conforme.
            </p>

            <h2>7. Résiliation et suppression de compte</h2>
            <p>
              L'utilisateur peut demander la suppression de son compte à tout moment. La suppression entraîne l'anonymisation de ses contributions (le contenu factuel est conservé pour l'intégrité du dossier, mais toute donnée personnelle est supprimée) et la suppression de ses données personnelles conformément à la politique de confidentialité.
            </p>
            <p>
              VLINKS se réserve le droit de suspendre ou résilier un compte en cas de violation des présentes conditions.
            </p>
          </article>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default TermsOfService;
