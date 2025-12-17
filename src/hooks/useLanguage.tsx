import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "fr" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations
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

    // Hero Section
    "hero.headline1": "Chaque VIN a une histoire.",
    "hero.subtitle": "Avant d'acheter un véhicule d'occasion, découvrez ce que d'autres ont déjà découvert.",
    "hero.p1": "Quand vous cherchez un véhicule d'occasion, la vérité se trouve rarement dans un seul document. Elle est dispersée entre les rapports d'inspection, les historiques Carfax, les échanges avec les vendeurs, les discussions avec les mécaniciens, les photos, les notes et les décisions prises par d'autres acheteurs avant vous.",
    "hero.p2": "VLINKS centralise ces informations autour d'un seul numéro VIN, pour révéler une image plus claire, plus complète et plus transparente de l'état réel d'un véhicule — avant que vous ne preniez votre décision.",
    "hero.cta": "Recherchez un VIN pour voir ce que d'autres ont déjà découvert.",
    "hero.searchPlaceholder": "Entrez un numéro VIN (ex: WVWZZZ3CZWE123456)",
    "hero.search": "Rechercher",
    "hero.vinLocation": "Le VIN se trouve sur le tableau de bord, la portière ou les documents du véhicule",
    "hero.tagline": "« La vérité est une chaîne. Vous êtes le maillon. »",
    "hero.trust1": "Recherche anonyme",
    "hero.trust2": "Données anonymisées",
    "hero.trust3": "Plateforme indépendante",
    "hero.contribution": "VLINKS existe parce que d'autres ont pris le temps de partager ce qu'ils ont découvert. Vous pourrez, vous aussi, contribuer quand ce sera pertinent pour vous.",

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
    "how.benefitsSubtitle": "VLINKS valorise les contributeurs qui partagent leurs découvertes.",
    "how.benefit1.title": "Crédits et récompenses",
    "how.benefit1.desc": "Chaque contribution validée vous rapporte des points échangeables contre des accès gratuits ou des avantages.",
    "how.benefit2.title": "Reconnaissance communautaire",
    "how.benefit2.desc": "Les contributeurs actifs sont reconnus et valorisés au sein de la communauté VLINKS.",
    "how.benefit3.title": "Accès prioritaire",
    "how.benefit3.desc": "Les contributeurs réguliers bénéficient d'un accès élargi aux informations de la plateforme.",
    "how.benefit4.title": "Protection de la vie privée",
    "how.benefit4.desc": "Vos informations personnelles sont automatiquement anonymisées. Seules les informations techniques sont partagées.",
    "how.orientation": "Que vous soyez en train d'acheter un véhicule ou que vous ayez déjà enquêté sur un VIN, VLINKS vous permet de transformer vos découvertes en informations utiles pour les autres.",
    "how.typesDisclaimer": "Les contributions doivent refléter des faits observés ou documentés, sans jugement personnel ni accusation.",
    "how.conclusionTitle": "Et maintenant ?",
    "how.conclusionP1": "Vous pouvez rechercher un VIN pour voir les informations déjà partagées, ou contribuer à un véhicule que vous avez déjà investigué.",
    "how.conclusionP2": "Vous n'êtes jamais obligé de contribuer. VLINKS fonctionne parce que chacun le fait quand c'est pertinent pour lui.",

    // Pricing Page - Reassuring Introduction
    "pricing.intro.title": "Vous restez toujours libre.",
    "pricing.intro.p1": "Rechercher un VIN sur VLINKS est toujours gratuit. Vous pouvez voir si des informations existent sur un véhicule sans jamais payer.",
    "pricing.intro.p2": "Le paiement n'intervient que si vous choisissez d'accéder aux contributions détaillées, afin de soutenir les personnes qui ont partagé leurs découvertes et de maintenir une plateforme indépendante.",
    
    // Pedagogical Steps
    "pricing.step1.title": "Rechercher un VIN",
    "pricing.step1.status": "gratuit",
    "pricing.step2.title": "Voir s'il existe des informations",
    "pricing.step2.status": "gratuit",
    "pricing.step3.title": "Débloquer le détail",
    "pricing.step3.status": "au choix : payer ou contribuer",
    
    // Unlock VIN Section
    "pricing.unlock.title": "Accès à un dossier VIN",
    "pricing.unlock.cardTitle": "Débloquer un dossier VIN",
    "pricing.unlock.perVin": "CAD",
    "pricing.unlock.desc": "Cet accès permet de consulter l'ensemble des contributions existantes sur un véhicule et de soutenir les membres qui ont partagé leurs informations.",
    "pricing.unlock.f1": "Rapports d'inspection",
    "pricing.unlock.f2": "Historiques de véhicule (Carfax, etc.)",
    "pricing.unlock.f3": "Communications avec le vendeur",
    "pricing.unlock.f4": "Retours de mécaniciens",
    "pricing.unlock.f5": "Notes et alertes communautaires",
    "pricing.unlock.cta": "Débloquer ce VIN",
    "pricing.unlock.reassurance": "Paiement unique · Aucun abonnement · Aucun renouvellement automatique",
    
    // Contribute Alternative Section
    "pricing.contribute.title": "Vous pouvez aussi ne rien payer.",
    "pricing.contribute.p1": "Si vous avez vous-même des informations sur un véhicule, vous pouvez les partager et gagner des crédits qui débloquent l'accès aux dossiers VIN.",
    "pricing.contribute.p2": "Plus vous contribuez, moins vous payez.",
    
    // Credit Packs Section
    "pricing.packs.title": "Paquets de crédits",
    "pricing.packs.credits": "crédits",
    "pricing.packs.cta": "Obtenir des crédits",
    "pricing.packs.note": "1 crédit = 1 dossier VIN débloqué. Les crédits n'expirent jamais.",
    "pricing.pack1.name": "Découverte",
    "pricing.pack1.price": "14,90 $ CAD",
    "pricing.pack1.desc": "Pour une recherche ponctuelle",
    "pricing.pack2.name": "Acheteur sérieux",
    "pricing.pack2.price": "24,90 $ CAD",
    "pricing.pack2.desc": "Pour comparer plusieurs véhicules",
    "pricing.pack3.name": "Contributeur",
    "pricing.pack3.price": "44,90 $ CAD",
    "pricing.pack3.desc": "Pour ceux qui partagent régulièrement",
    
    // Earn Credits Section
    "pricing.earn.title": "Gagnez des crédits en contribuant",
    "pricing.earn.inspection": "Rapports d'inspection",
    "pricing.earn.history": "Historiques de véhicule",
    "pricing.earn.seller": "Communications avec le vendeur",
    "pricing.earn.mechanic": "Retours de mécaniciens",
    "pricing.earn.cta": "Commencer à contribuer",
    
    // Philosophy Section
    "pricing.philosophy.title": "Pourquoi ce modèle existe",
    "pricing.philosophy.intro": "VLINKS fonctionne grâce à sa communauté. Les frais d'accès servent à :",
    "pricing.philosophy.reason1": "maintenir la plateforme",
    "pricing.philosophy.reason2": "protéger l'anonymat",
    "pricing.philosophy.reason3": "valoriser les contributions honnêtes",
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

    // Hero Section
    "hero.headline1": "Every VIN has a story.",
    "hero.subtitle": "Before buying a used vehicle, discover what others have already found.",
    "hero.p1": "When searching for a used vehicle, the truth is rarely found in a single document. It is scattered across inspection reports, Carfax histories, exchanges with sellers, discussions with mechanics, photos, notes, and decisions made by previous buyers before you.",
    "hero.p2": "VLINKS centralizes this information around a single VIN number, to reveal a clearer, more complete, and more transparent picture of a vehicle's real condition — before you make your decision.",
    "hero.cta": "Search a VIN to see what others have already discovered.",
    "hero.searchPlaceholder": "Enter a VIN number (e.g., WVWZZZ3CZWE123456)",
    "hero.search": "Search",
    "hero.vinLocation": "The VIN is located on the dashboard, door jamb, or vehicle documents",
    "hero.tagline": '"Truth is a chain. You are the link."',
    "hero.trust1": "Anonymous search",
    "hero.trust2": "Anonymized data",
    "hero.trust3": "Independent platform",
    "hero.contribution": "VLINKS exists because others took the time to share what they discovered. You too can contribute when it's relevant for you.",

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
    "how.benefitsSubtitle": "VLINKS values contributors who share their discoveries.",
    "how.benefit1.title": "Credits and rewards",
    "how.benefit1.desc": "Each validated contribution earns you points exchangeable for free access or benefits.",
    "how.benefit2.title": "Community recognition",
    "how.benefit2.desc": "Active contributors are recognized and valued within the VLINKS community.",
    "how.benefit3.title": "Priority access",
    "how.benefit3.desc": "Regular contributors benefit from expanded access to platform information.",
    "how.benefit4.title": "Privacy protection",
    "how.benefit4.desc": "Your personal information is automatically anonymized. Only technical information is shared.",
    "how.orientation": "Whether you're currently buying a vehicle or have already investigated a VIN, VLINKS allows you to turn your discoveries into useful information for others.",
    "how.typesDisclaimer": "Contributions should reflect observed or documented facts, without personal judgment or accusations.",
    "how.conclusionTitle": "What's next?",
    "how.conclusionP1": "You can search a VIN to see information already shared, or contribute to a vehicle you've already investigated.",
    "how.conclusionP2": "You're never obligated to contribute. VLINKS works because everyone does it when it's relevant for them.",

    // Pricing Page - Reassuring Introduction
    "pricing.intro.title": "You always stay free.",
    "pricing.intro.p1": "Searching a VIN on VLINKS is always free. You can see if information exists on a vehicle without ever paying.",
    "pricing.intro.p2": "Payment only occurs if you choose to access detailed contributions, to support the people who shared their discoveries and to maintain an independent platform.",
    
    // Pedagogical Steps
    "pricing.step1.title": "Search a VIN",
    "pricing.step1.status": "free",
    "pricing.step2.title": "See if information exists",
    "pricing.step2.status": "free",
    "pricing.step3.title": "Unlock the details",
    "pricing.step3.status": "your choice: pay or contribute",
    
    // Unlock VIN Section
    "pricing.unlock.title": "Access to a VIN dossier",
    "pricing.unlock.cardTitle": "Unlock a VIN dossier",
    "pricing.unlock.perVin": "CAD",
    "pricing.unlock.desc": "This access allows you to view all existing contributions on a vehicle and support the members who shared their information.",
    "pricing.unlock.f1": "Inspection reports",
    "pricing.unlock.f2": "Vehicle history reports (e.g. Carfax)",
    "pricing.unlock.f3": "Seller communications",
    "pricing.unlock.f4": "Mechanic feedback",
    "pricing.unlock.f5": "Community notes and alerts",
    "pricing.unlock.cta": "Unlock this VIN",
    "pricing.unlock.reassurance": "One-time payment · No subscription · No automatic renewal",
    
    // Contribute Alternative Section
    "pricing.contribute.title": "You can also pay nothing.",
    "pricing.contribute.p1": "If you have information about a vehicle yourself, you can share it and earn credits that unlock access to VIN dossiers.",
    "pricing.contribute.p2": "The more you contribute, the less you pay.",
    
    // Credit Packs Section
    "pricing.packs.title": "Credit packs",
    "pricing.packs.credits": "credits",
    "pricing.packs.cta": "Get credits",
    "pricing.packs.note": "1 credit = 1 VIN dossier unlocked. Credits never expire.",
    "pricing.pack1.name": "Discovery",
    "pricing.pack1.price": "$14.90 CAD",
    "pricing.pack1.desc": "For a one-time search",
    "pricing.pack2.name": "Serious Buyer",
    "pricing.pack2.price": "$24.90 CAD",
    "pricing.pack2.desc": "To compare several vehicles",
    "pricing.pack3.name": "Contributor",
    "pricing.pack3.price": "$44.90 CAD",
    "pricing.pack3.desc": "For those who share regularly",
    
    // Earn Credits Section
    "pricing.earn.title": "Earn credits by contributing",
    "pricing.earn.inspection": "Inspection reports",
    "pricing.earn.history": "Vehicle history reports",
    "pricing.earn.seller": "Seller communications",
    "pricing.earn.mechanic": "Mechanic insights",
    "pricing.earn.cta": "Start contributing",
    
    // Philosophy Section
    "pricing.philosophy.title": "Why this model exists",
    "pricing.philosophy.intro": "VLINKS works thanks to its community. Access fees are used to:",
    "pricing.philosophy.reason1": "maintain the platform",
    "pricing.philosophy.reason2": "protect anonymity",
    "pricing.philosophy.reason3": "value honest contributions",
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
