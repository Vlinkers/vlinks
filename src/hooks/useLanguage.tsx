import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "fr" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Navigation
    "nav.home": "Accueil",
    "nav.howItWorks": "Comment ça marche",
    "nav.pricing": "Tarifs",
    "nav.why": "Pourquoi VLINKS",
    "nav.login": "Connexion",
    "nav.contribute": "Contribuer",
    "nav.profile": "Mon profil",
    "nav.logout": "Déconnexion",

    // Launch Banner
    "launch.banner": "VLINKS est actuellement en phase de lancement. L'accès aux rapports est gratuit pour une durée limitée.",

    // Hero Section
    "hero.headline1": "Chaque VIN a une histoire.",
    "hero.subtitle": "Avant de signer. Découvrez ce que d'autres ont déjà trouvé.",
    "hero.bullet1": "Rapports d'inspection et documents",
    "hero.bullet2": "Historique et échanges vérifiés",
    "hero.bullet3": "Observations d'acheteurs précédents",
    "hero.searchPlaceholder": "Entrez un VIN",
    "hero.search": "Rechercher",
    "hero.vinLocation": "Le VIN se trouve sur le tableau de bord, la portière ou les documents du véhicule",
    "hero.contributeCta": "Contribuer à un VIN",

    // Social Proof
    "social.vins": "VIN enrichis",
    "social.contributions": "Contributions validées",
    "social.documents": "Documents ajoutés",

    // How It Works Page
    "how.title": "Comment fonctionne",
    "how.subtitle": "VLINKS repose sur un principe simple : les informations que vous découvrez sur un véhicule ne devraient pas disparaître après votre recherche. Elles peuvent aider le prochain acheteur.",
    "how.typesTitle": "Quelles informations pouvez-vous partager ?",
    "how.typesSubtitle": "Toute information qui vous a aidé à évaluer un véhicule peut être précieuse pour d'autres.",
    "how.type1.title": "Rapports d'inspection professionnels",
    "how.type1.desc": "Partagez les résumés de vos inspections pré-achat (CAA, garages certifiés, etc.) pour que d'autres acheteurs bénéficient de vos découvertes.",
    "how.type2.title": "Historiques de véhicule (Carfax, CarProof)",
    "how.type2.desc": "Les données que vous avez payées peuvent aider d'autres acheteurs à éviter les mêmes frais et découvrir les mêmes informations.",
    "how.type3.title": "Échanges avec le vendeur",
    "how.type3.desc": "Documentez les conversations importantes : ce que le vendeur a affirmé, promis ou omis de mentionner.",
    "how.type4.title": "Discussions avec des mécaniciens",
    "how.type4.desc": "Les avis techniques informels d'un mécanicien peuvent révéler des problèmes que les rapports officiels ne mentionnent pas.",
    "how.type5.title": "Photos et vidéos",
    "how.type5.desc": "Images du véhicule, de son état réel, des défauts constatés ou des réparations effectuées.",
    "how.type6.title": "Signaux d'alerte et observations",
    "how.type6.desc": "Tout ce qui vous a semblé suspect : comportement du vendeur, incohérences, problèmes cachés.",
    "how.buildTitle": "Comment la transparence se construit",
    "how.buildSubtitle": "Chaque contribution est un maillon. Ensemble, elles forment une chaîne de vérité.",
    "how.step1.title": "Un acheteur découvre des informations",
    "how.step1.desc": "Lors de sa recherche, un acheteur paie une inspection, obtient un historique, ou découvre des informations importantes sur un véhicule.",
    "how.step2.title": "Il partage ce qu'il a appris",
    "how.step2.desc": "Plutôt que de laisser cette information disparaître, il la contribue sur VLINKS, associée au numéro VIN du véhicule.",
    "how.step3.title": "Les contributions s'accumulent",
    "how.step3.desc": "Avec le temps, plusieurs acheteurs, anciens propriétaires et mécaniciens ajoutent leurs propres informations au même VIN.",
    "how.step4.title": "Une image complète émerge",
    "how.step4.desc": "La combinaison de ces fragments de vérité révèle une vision transparente et fiable de l'historique réel du véhicule.",
    "how.benefitsTitle": "Ce que vous gagnez en contribuant",
    "how.benefitsSubtitle": "VLINKS valorise la transparence et la solidarité entre acheteurs.",
    "how.benefit1.title": "Transparence pour tous",
    "how.benefit1.desc": "Chaque contribution enrichit le dossier d'un véhicule et aide de futurs acheteurs à prendre de meilleures décisions.",
    "how.benefit2.title": "Reconnaissance communautaire",
    "how.benefit2.desc": "Les contributeurs actifs sont reconnus et valorisés au sein de la communauté VLINKS.",
    "how.benefit3.title": "Accès gratuit pendant le lancement",
    "how.benefit3.desc": "Pendant la phase de lancement, l'accès à tous les dossiers VIN est entièrement gratuit.",
    "how.benefit4.title": "Protection de la vie privée",
    "how.benefit4.desc": "Vos informations personnelles sont automatiquement anonymisées. Seules les informations techniques sont partagées.",
    "how.orientation": "Que vous soyez en train d'acheter un véhicule ou que vous ayez déjà enquêté sur un VIN, VLINKS vous permet de transformer vos découvertes en informations utiles pour les autres.",
    "how.typesDisclaimer": "Les contributions doivent refléter des faits observés ou documentés, sans jugement personnel ni accusation.",
    "how.conclusionTitle": "Et maintenant ?",
    "how.conclusionP1": "Vous pouvez rechercher un VIN pour voir les informations déjà partagées, ou contribuer à un véhicule que vous avez déjà investigué.",
    "how.conclusionP2": "Vous n'êtes jamais obligé de contribuer. VLINKS fonctionne parce que chacun le fait quand c'est pertinent pour lui.",

    // Pricing Page
    "pricing.intro.title": "Gratuit pendant le lancement.",
    "pricing.intro.p1": "VLINKS est actuellement en phase de lancement. L'accès aux dossiers VIN et aux contributions de la communauté est entièrement gratuit.",
    "pricing.intro.p2": "Un modèle tarifaire sera introduit ultérieurement pour assurer la pérennité de la plateforme. Les contributeurs actuels bénéficieront d'avantages exclusifs.",
    
    "pricing.step1.title": "Rechercher un VIN",
    "pricing.step1.status": "gratuit",
    "pricing.step2.title": "Consulter les contributions",
    "pricing.step2.status": "gratuit",
    "pricing.step3.title": "Télécharger un rapport",
    "pricing.step3.status": "gratuit (lancement)",
    
    "pricing.unlock.title": "Accès aux dossiers VIN",
    "pricing.unlock.cardTitle": "Accès complet",
    "pricing.unlock.perVin": "",
    "pricing.unlock.desc": "Pendant la phase de lancement, l'accès à l'ensemble des contributions est gratuit. Consultez les rapports d'inspection, historiques et observations partagés par la communauté.",
    "pricing.unlock.f1": "Rapports d'inspection",
    "pricing.unlock.f2": "Historiques de véhicule (Carfax, etc.)",
    "pricing.unlock.f3": "Communications avec le vendeur",
    "pricing.unlock.f4": "Retours de mécaniciens",
    "pricing.unlock.f5": "Notes et alertes communautaires",
    "pricing.unlock.cta": "Rechercher un VIN",
    "pricing.unlock.reassurance": "Aucune inscription requise pour consulter · Compte requis pour contribuer",
    
    "pricing.contribute.title": "Contribuez à la communauté.",
    "pricing.contribute.p1": "Si vous avez des informations sur un véhicule, vous pouvez les partager pour aider d'autres acheteurs. Un compte utilisateur est nécessaire pour contribuer.",
    "pricing.contribute.p2": "Les contributions sont revues et validées manuellement par VLINKS.",
    
    "pricing.philosophy.title": "Pourquoi ce modèle existe",
    "pricing.philosophy.intro": "VLINKS fonctionne grâce à sa communauté. La gratuité actuelle est temporaire et vise à :",
    "pricing.philosophy.reason1": "construire une base de données fiable",
    "pricing.philosophy.reason2": "protéger l'anonymat des contributeurs",
    "pricing.philosophy.reason3": "prouver la valeur de la transparence collective",
    "pricing.philosophy.conclusion": "L'objectif n'est pas de faire payer, mais de récompenser la transparence.",

    // Footer & Common
    "common.tagline": "« La vérité est une chaîne. Vous êtes le maillon. »",
  },
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.howItWorks": "How It Works",
    "nav.pricing": "Pricing",
    "nav.why": "Why VLINKS",
    "nav.login": "Sign In",
    "nav.contribute": "Contribute",
    "nav.profile": "My Profile",
    "nav.logout": "Sign Out",

    // Launch Banner
    "launch.banner": "VLINKS is currently in launch phase. Access to reports is free for a limited time.",

    // Hero Section
    "hero.headline1": "Every VIN has a story.",
    "hero.subtitle": "Before you sign. Discover what others have already found.",
    "hero.bullet1": "Inspection reports and documents",
    "hero.bullet2": "Verified history and exchanges",
    "hero.bullet3": "Observations from previous buyers",
    "hero.searchPlaceholder": "Enter a VIN",
    "hero.search": "Search",
    "hero.vinLocation": "The VIN is located on the dashboard, door jamb, or vehicle documents",
    "hero.contributeCta": "Contribute to a VIN",

    // Social Proof
    "social.vins": "VINs enriched",
    "social.contributions": "Validated contributions",
    "social.documents": "Documents added",

    // How It Works Page
    "how.title": "How",
    "how.subtitle": "VLINKS is based on a simple principle: the information you discover about a vehicle should not disappear after your search. It can help the next buyer.",
    "how.typesTitle": "What information can you share?",
    "how.typesSubtitle": "Any information that helped you evaluate a vehicle can be valuable to others.",
    "how.type1.title": "Professional inspection reports",
    "how.type1.desc": "Share summaries of your pre-purchase inspections (AAA, certified garages, etc.) so other buyers can benefit from your findings.",
    "how.type2.title": "Vehicle history (Carfax, CarProof)",
    "how.type2.desc": "The data you paid for can help other buyers avoid the same fees and discover the same information.",
    "how.type3.title": "Exchanges with the seller",
    "how.type3.desc": "Document important conversations: what the seller claimed, promised, or failed to mention.",
    "how.type4.title": "Discussions with mechanics",
    "how.type4.desc": "Informal technical opinions from a mechanic can reveal problems that official reports don't mention.",
    "how.type5.title": "Photos and videos",
    "how.type5.desc": "Images of the vehicle, its actual condition, defects found, or repairs performed.",
    "how.type6.title": "Red flags and observations",
    "how.type6.desc": "Anything that seemed suspicious: seller behavior, inconsistencies, hidden problems.",
    "how.buildTitle": "How transparency is built",
    "how.buildSubtitle": "Each contribution is a link. Together, they form a chain of truth.",
    "how.step1.title": "A buyer discovers information",
    "how.step1.desc": "During their search, a buyer pays for an inspection, gets a history report, or discovers important information about a vehicle.",
    "how.step2.title": "They share what they learned",
    "how.step2.desc": "Rather than letting this information disappear, they contribute it on VLINKS, associated with the vehicle's VIN number.",
    "how.step3.title": "Contributions accumulate",
    "how.step3.desc": "Over time, multiple buyers, former owners, and mechanics add their own information to the same VIN.",
    "how.step4.title": "A complete picture emerges",
    "how.step4.desc": "The combination of these fragments of truth reveals a transparent and reliable view of the vehicle's real history.",
    "how.benefitsTitle": "What you gain by contributing",
    "how.benefitsSubtitle": "VLINKS values transparency and solidarity between buyers.",
    "how.benefit1.title": "Transparency for all",
    "how.benefit1.desc": "Each contribution enriches a vehicle's file and helps future buyers make better decisions.",
    "how.benefit2.title": "Community recognition",
    "how.benefit2.desc": "Active contributors are recognized and valued within the VLINKS community.",
    "how.benefit3.title": "Free access during launch",
    "how.benefit3.desc": "During the launch phase, access to all VIN files is completely free.",
    "how.benefit4.title": "Privacy protection",
    "how.benefit4.desc": "Your personal information is automatically anonymized. Only technical information is shared.",
    "how.orientation": "Whether you're currently buying a vehicle or have already investigated a VIN, VLINKS allows you to turn your discoveries into useful information for others.",
    "how.typesDisclaimer": "Contributions should reflect observed or documented facts, without personal judgment or accusations.",
    "how.conclusionTitle": "What's next?",
    "how.conclusionP1": "You can search a VIN to see information already shared, or contribute to a vehicle you've already investigated.",
    "how.conclusionP2": "You're never obligated to contribute. VLINKS works because everyone does it when it's relevant for them.",

    // Pricing Page
    "pricing.intro.title": "Free during launch.",
    "pricing.intro.p1": "VLINKS is currently in its launch phase. Access to VIN files and community contributions is completely free.",
    "pricing.intro.p2": "A pricing model will be introduced later to ensure the platform's sustainability. Current contributors will receive exclusive benefits.",
    
    "pricing.step1.title": "Search a VIN",
    "pricing.step1.status": "free",
    "pricing.step2.title": "View contributions",
    "pricing.step2.status": "free",
    "pricing.step3.title": "Download a report",
    "pricing.step3.status": "free (launch)",
    
    "pricing.unlock.title": "Access to VIN files",
    "pricing.unlock.cardTitle": "Full access",
    "pricing.unlock.perVin": "",
    "pricing.unlock.desc": "During the launch phase, access to all contributions is free. View inspection reports, histories and observations shared by the community.",
    "pricing.unlock.f1": "Inspection reports",
    "pricing.unlock.f2": "Vehicle history reports (e.g. Carfax)",
    "pricing.unlock.f3": "Seller communications",
    "pricing.unlock.f4": "Mechanic feedback",
    "pricing.unlock.f5": "Community notes and alerts",
    "pricing.unlock.cta": "Search a VIN",
    "pricing.unlock.reassurance": "No registration required to view · Account required to contribute",
    
    "pricing.contribute.title": "Contribute to the community.",
    "pricing.contribute.p1": "If you have information about a vehicle, you can share it to help other buyers. A user account is required to contribute.",
    "pricing.contribute.p2": "Contributions are reviewed and validated manually by VLINKS.",
    
    "pricing.philosophy.title": "Why this model exists",
    "pricing.philosophy.intro": "VLINKS works thanks to its community. The current free access is temporary and aims to:",
    "pricing.philosophy.reason1": "build a reliable database",
    "pricing.philosophy.reason2": "protect contributor anonymity",
    "pricing.philosophy.reason3": "prove the value of collective transparency",
    "pricing.philosophy.conclusion": "The goal is not to charge money, but to reward transparency.",

    // Footer & Common
    "common.tagline": '"Truth is a chain. You are the link."',
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("vlinks-language");
    return (saved as Language) || "fr";
  });

  useEffect(() => {
    localStorage.setItem("vlinks-language", language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
