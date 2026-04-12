import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const LegalNotice = () => {
  return (
    <>
      <SEO
        title="Mentions légales – VLINKS"
        description="Mentions légales de la plateforme VLINKS. Identité de l'éditeur, hébergement et procédure de signalement."
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-sm text-amber-800">
            Ce document est un modèle et devrait être revu par un conseiller juridique.
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Mentions légales</h1>
          <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : avril 2026</p>

          <article className="prose prose-neutral max-w-none text-foreground">
            <h2>1. Identité de l'éditeur</h2>
            <p>
              <strong>VLINKS</strong> (marque de Vlinkers)<br />
              Québec, Canada<br />
              Courriel : <strong>contact@vlinks.ca</strong>
            </p>

            <h2>2. Hébergement</h2>
            <p>
              L'infrastructure technique de VLINKS est hébergée par des fournisseurs de services infonuagiques reconnus (Supabase, Vercel) dont les serveurs sont situés en Amérique du Nord.
            </p>

            <h2>3. Statut juridique</h2>
            <p>
              <strong>VLINKS agit en qualité d'hébergeur de contenu généré par les utilisateurs</strong>, au sens de la Loi concernant le cadre juridique des technologies de l'information (LCCJTI) du Québec.
            </p>
            <p>
              VLINKS ne produit pas de contenu éditorial. Les informations affichées sur les dossiers VIN proviennent exclusivement des contributions des utilisateurs de la plateforme.
            </p>

            <h2>4. Contact</h2>
            <p>
              Pour toute question relative au fonctionnement de la plateforme : <strong>contact@vlinks.ca</strong><br />
              Pour toute question relative à la protection des renseignements personnels : <strong>privacy@vlinks.ca</strong>
            </p>

            <h2>5. Procédure de signalement de contenu illicite</h2>
            <p>
              Conformément aux articles 22 et suivants de la LCCJTI, toute personne peut signaler un contenu qu'elle estime illicite hébergé sur VLINKS.
            </p>
            <p>Le signalement doit contenir :</p>
            <ul>
              <li>L'identité du demandeur (nom, prénom, coordonnées)</li>
              <li>La description du contenu litigieux et sa localisation précise sur la plateforme (VIN, contribution concernée)</li>
              <li>Les motifs pour lesquels le contenu devrait être retiré</li>
              <li>Toute pièce justificative pertinente</li>
            </ul>
            <p>
              Les signalements doivent être adressés à : <strong>signalement@vlinks.ca</strong>
            </p>
            <p>
              VLINKS s'engage à accuser réception du signalement dans un délai de 48 heures et à procéder au retrait de tout contenu manifestement illicite dans les meilleurs délais.
            </p>

            <h2>6. Limitation de responsabilité</h2>
            <p>
              En tant qu'hébergeur, VLINKS n'est pas tenue à une obligation générale de surveillance du contenu publié par les utilisateurs. Sa responsabilité ne peut être engagée que si, ayant été informée du caractère illicite d'un contenu, elle n'a pas agi promptement pour le retirer.
            </p>
          </article>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default LegalNotice;
