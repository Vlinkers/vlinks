import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const PrivacyPolicy = () => {
  return (
    <>
      <SEO
        title="Politique de confidentialité – VLINKS"
        description="Politique de confidentialité de VLINKS, conforme à la Loi 25 du Québec. Protection des renseignements personnels."
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-sm text-amber-800">
            Ce document est un modèle et devrait être revu par un conseiller juridique.
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Politique de confidentialité</h1>
          <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : avril 2026 · Conforme à la Loi 25 du Québec</p>

          <article className="prose prose-neutral max-w-none text-foreground">
            <h2>1. Responsable de la protection des renseignements personnels</h2>
            <p>
              Le responsable de la protection des renseignements personnels chez VLINKS peut être contacté à l'adresse suivante : <strong>privacy@vlinks.ca</strong>.
            </p>

            <h2>2. Renseignements collectés</h2>
            <h3>Données de compte</h3>
            <p>Adresse courriel, nom d'utilisateur, mot de passe (haché et salé – jamais stocké en clair).</p>
            <h3>Contributions</h3>
            <p>Contenu textuel, fichiers joints (photos, documents), métadonnées (date, rôle du contributeur, niveau de preuve).</p>
            <h3>Vérification de propriété</h3>
            <p>Documents de propriété soumis dans le cadre de la vérification d'identité. Ces documents sont conservés de façon sécurisée et ne sont jamais rendus publics.</p>
            <h3>Données de navigation</h3>
            <p>Cookies fonctionnels uniquement, nécessaires au bon fonctionnement de la plateforme. VLINKS n'utilise aucun cookie de traçage publicitaire ni outil d'analytique tiers.</p>

            <h2>3. Finalités du traitement</h2>
            <ul>
              <li>Fonctionnement de la plateforme (inscription, authentification, gestion de compte)</li>
              <li>Modération du contenu (conformité aux règles de la plateforme)</li>
              <li>Calcul des scores de confiance (algorithme automatique)</li>
              <li>Notifications (alertes relatives aux contributions et dossiers suivis)</li>
            </ul>

            <h2>4. Consentement (Loi 25)</h2>
            <p>
              Conformément à la Loi 25 du Québec, VLINKS recueille le consentement explicite de l'utilisateur au moment de l'inscription pour chaque finalité de traitement.
            </p>
            <p>
              L'utilisateur peut retirer son consentement à tout moment, pour chaque finalité séparément, depuis les paramètres de son compte ou en contactant le responsable de la protection des renseignements personnels.
            </p>

            <h2>5. Droits des utilisateurs (Loi 25)</h2>
            <ul>
              <li><strong>Droit d'accès</strong> : obtenir une copie de ses renseignements personnels détenus par VLINKS</li>
              <li><strong>Droit de rectification</strong> : corriger des renseignements inexacts ou incomplets</li>
              <li><strong>Droit à la suppression (droit à l'oubli)</strong> : demander la suppression de ses renseignements personnels</li>
              <li><strong>Droit à la portabilité</strong> : recevoir ses renseignements dans un format structuré et couramment utilisé</li>
            </ul>
            <p>
              Pour exercer l'un de ces droits, veuillez contacter <strong>privacy@vlinks.ca</strong> en précisant votre demande. VLINKS traitera votre demande dans un délai de 30 jours.
            </p>

            <h2>6. Conservation des données</h2>
            <h3>Contributions</h3>
            <p>Conservées tant que le dossier VIN existe sur la plateforme. En cas de suppression de compte, les contributions sont anonymisées (le contenu factuel est préservé pour l'intégrité du dossier).</p>
            <h3>Documents de vérification</h3>
            <p>Supprimés après vérification complétée. Seul le statut de vérification (vérifié/non vérifié) est conservé.</p>
            <h3>Données de compte</h3>
            <p>Supprimées dans les 30 jours suivant la demande de suppression du compte.</p>

            <h2>7. Sécurité</h2>
            <p>
              VLINKS met en œuvre des mesures de sécurité techniques et organisationnelles, notamment :
            </p>
            <ul>
              <li>Chiffrement en transit (TLS/HTTPS) et au repos</li>
              <li>Accès restreint aux données de vérification (personnel autorisé uniquement)</li>
              <li>Hachage des mots de passe avec algorithme robuste</li>
              <li>Journalisation des accès administratifs</li>
            </ul>

            <h2>8. Incident de confidentialité</h2>
            <p>
              Conformément à la Loi 25, en cas d'incident de confidentialité présentant un risque de préjudice sérieux, VLINKS s'engage à :
            </p>
            <ul>
              <li>Aviser la Commission d'accès à l'information du Québec dans un délai de 72 heures</li>
              <li>Aviser les personnes concernées dans les meilleurs délais</li>
              <li>Tenir un registre des incidents de confidentialité</li>
            </ul>
          </article>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PrivacyPolicy;
