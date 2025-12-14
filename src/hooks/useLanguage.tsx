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
    "hero.badge": "Plateforme communautaire indépendante",
    "hero.headline1": "Chaque VIN a une histoire.",
    "hero.headline2": "VLINKS relie les pièces manquantes.",
    "hero.p1": "Quand vous cherchez un véhicule d'occasion, la vérité se trouve rarement dans un seul document. Elle est dispersée entre les rapports d'inspection, les historiques de véhicule, les conversations avec les vendeurs, les discussions avec les mécaniciens, les photos, les notes et les décisions des acheteurs précédents.",
    "hero.p2": "VLINKS centralise toutes ces contributions autour d'un seul numéro VIN. Les acheteurs qui ont enquêté sur un véhicule avant vous peuvent partager ce qu'ils ont découvert — rapports d'inspection professionnels, données Carfax, échanges écrits, avertissements, signaux d'alerte et observations qui n'apparaissent pas toujours dans les documents officiels.",
    "hero.p3": "En connectant ces expériences individuelles, VLINKS aide à révéler une image plus claire et plus transparente de l'état réel et de l'historique d'un véhicule.",
    "hero.cta": "Recherchez un VIN pour voir ce que d'autres ont déjà découvert.",
    "hero.searchPlaceholder": "Entrez un numéro VIN (ex: WVWZZZ3CZWE123456)",
    "hero.search": "Rechercher",
    "hero.vinLocation": "Le VIN se trouve sur le tableau de bord, la portière ou les documents du véhicule",
    "hero.tagline": "« La vérité est une chaîne. Vous êtes le maillon. »",
    "hero.stat1": "VINs documentés",
    "hero.stat2": "Contributeurs actifs",
    "hero.stat3": "Taux de confiance",
    "hero.trust1": "Communauté vérifiée",
    "hero.trust2": "Données anonymisées",
    "hero.trust3": "100% indépendant",

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

    // Pricing Page
    "pricing.title": "Tarifs",
    "pricing.titleGradient": "simples et transparents",
    "pricing.subtitle": "Accédez aux informations dont vous avez besoin, ou contribuez pour obtenir des accès gratuits. Pas d'abonnement obligatoire, pas de frais cachés.",
    "pricing.popular": "Populaire",
    "pricing.plan1.name": "Gratuit",
    "pricing.plan1.price": "0 $",
    "pricing.plan1.desc": "Accès de base pour découvrir la plateforme",
    "pricing.plan1.f1": "Recherche illimitée de VINs",
    "pricing.plan1.f2": "Aperçu des contributions disponibles",
    "pricing.plan1.f3": "Nombre de contributions visible",
    "pricing.plan1.f4": "Résumé général du véhicule",
    "pricing.plan1.cta": "Commencer gratuitement",
    "pricing.plan2.name": "Accès VIN",
    "pricing.plan2.price": "4,99 $",
    "pricing.plan2.period": "par VIN",
    "pricing.plan2.desc": "Accès complet aux informations d'un véhicule spécifique",
    "pricing.plan2.f1": "Toutes les contributions détaillées",
    "pricing.plan2.f2": "Photos et documents partagés",
    "pricing.plan2.f3": "Historique des observations",
    "pricing.plan2.f4": "Signaux d'alerte identifiés",
    "pricing.plan2.f5": "Résumés d'inspection",
    "pricing.plan2.cta": "Débloquer un VIN",
    "pricing.plan3.name": "Contributeur",
    "pricing.plan3.price": "Gratuit",
    "pricing.plan3.period": "avec contributions",
    "pricing.plan3.desc": "Accès gratuit en échange de vos contributions",
    "pricing.plan3.f1": "1 contribution validée = 1 accès VIN gratuit",
    "pricing.plan3.f2": "Points cumulables",
    "pricing.plan3.f3": "Badge contributeur",
    "pricing.plan3.f4": "Accès prioritaire aux nouvelles fonctionnalités",
    "pricing.plan3.f5": "Reconnaissance communautaire",
    "pricing.plan3.cta": "Contribuer maintenant",
    "pricing.creditsTitle": "Barème des contributions",
    "pricing.creditsSubtitle": "Plus votre contribution est complète et utile, plus elle vous rapporte.",
    "pricing.credit1.type": "Rapport d'inspection partagé",
    "pricing.credit1.points": "50 points",
    "pricing.credit1.access": "= 5 accès VIN",
    "pricing.credit2.type": "Historique véhicule (Carfax, etc.)",
    "pricing.credit2.points": "30 points",
    "pricing.credit2.access": "= 3 accès VIN",
    "pricing.credit3.type": "Photos avec description",
    "pricing.credit3.points": "10 points",
    "pricing.credit3.access": "= 1 accès VIN",
    "pricing.credit4.type": "Observation ou signal d'alerte",
    "pricing.credit4.points": "5 points",
    "pricing.credit4.access": "= 0.5 accès VIN",
    "pricing.credit5.type": "Échange documenté avec vendeur",
    "pricing.credit5.points": "15 points",
    "pricing.credit5.access": "= 1.5 accès VIN",
    "pricing.creditsNote": "10 points = 1 accès VIN complet. Les points n'expirent jamais.",
    "pricing.faqTitle": "Pourquoi ce modèle ?",
    "pricing.faqDesc": "VLINKS fonctionne grâce à la communauté. Les frais d'accès permettent de maintenir la plateforme et de récompenser les contributeurs. Plus vous contribuez, moins vous payez.",
    "pricing.tableType": "Type de contribution",
    "pricing.tablePoints": "Points",
    "pricing.tableEquivalent": "Équivalent",

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
    "hero.badge": "Independent community platform",
    "hero.headline1": "Every VIN has a story.",
    "hero.headline2": "VLINKS connects the missing pieces.",
    "hero.p1": "When searching for a used vehicle, the truth is rarely found in a single document. It is spread across inspection reports, vehicle history records, conversations with sellers, discussions with mechanics, photos, notes, and decisions made by previous buyers.",
    "hero.p2": "VLINKS centralizes all these contributions around a single VIN number. Buyers who investigated a vehicle before you can share what they discovered — professional inspection reports, Carfax data, written exchanges, warnings, red flags, and insights that don't always appear in formal documents.",
    "hero.p3": "By connecting these individual experiences, VLINKS helps reveal a clearer, more transparent picture of a vehicle's real condition and history.",
    "hero.cta": "Search a VIN to see what others have already uncovered.",
    "hero.searchPlaceholder": "Enter a VIN number (e.g., WVWZZZ3CZWE123456)",
    "hero.search": "Search",
    "hero.vinLocation": "The VIN is located on the dashboard, door jamb, or vehicle documents",
    "hero.tagline": '"Truth is a chain. You are the link."',
    "hero.stat1": "Documented VINs",
    "hero.stat2": "Active contributors",
    "hero.stat3": "Trust rate",
    "hero.trust1": "Verified community",
    "hero.trust2": "Anonymized data",
    "hero.trust3": "100% independent",

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

    // Pricing Page
    "pricing.title": "Simple and",
    "pricing.titleGradient": "transparent pricing",
    "pricing.subtitle": "Access the information you need, or contribute to get free access. No mandatory subscription, no hidden fees.",
    "pricing.popular": "Popular",
    "pricing.plan1.name": "Free",
    "pricing.plan1.price": "$0",
    "pricing.plan1.desc": "Basic access to discover the platform",
    "pricing.plan1.f1": "Unlimited VIN searches",
    "pricing.plan1.f2": "Preview of available contributions",
    "pricing.plan1.f3": "Number of contributions visible",
    "pricing.plan1.f4": "General vehicle summary",
    "pricing.plan1.cta": "Start for free",
    "pricing.plan2.name": "VIN Access",
    "pricing.plan2.price": "$4.99",
    "pricing.plan2.period": "per VIN",
    "pricing.plan2.desc": "Full access to information on a specific vehicle",
    "pricing.plan2.f1": "All detailed contributions",
    "pricing.plan2.f2": "Shared photos and documents",
    "pricing.plan2.f3": "Observation history",
    "pricing.plan2.f4": "Identified red flags",
    "pricing.plan2.f5": "Inspection summaries",
    "pricing.plan2.cta": "Unlock a VIN",
    "pricing.plan3.name": "Contributor",
    "pricing.plan3.price": "Free",
    "pricing.plan3.period": "with contributions",
    "pricing.plan3.desc": "Free access in exchange for your contributions",
    "pricing.plan3.f1": "1 validated contribution = 1 free VIN access",
    "pricing.plan3.f2": "Cumulative points",
    "pricing.plan3.f3": "Contributor badge",
    "pricing.plan3.f4": "Priority access to new features",
    "pricing.plan3.f5": "Community recognition",
    "pricing.plan3.cta": "Contribute now",
    "pricing.creditsTitle": "Contribution scale",
    "pricing.creditsSubtitle": "The more complete and useful your contribution, the more you earn.",
    "pricing.credit1.type": "Shared inspection report",
    "pricing.credit1.points": "50 points",
    "pricing.credit1.access": "= 5 VIN accesses",
    "pricing.credit2.type": "Vehicle history (Carfax, etc.)",
    "pricing.credit2.points": "30 points",
    "pricing.credit2.access": "= 3 VIN accesses",
    "pricing.credit3.type": "Photos with description",
    "pricing.credit3.points": "10 points",
    "pricing.credit3.access": "= 1 VIN access",
    "pricing.credit4.type": "Observation or red flag",
    "pricing.credit4.points": "5 points",
    "pricing.credit4.access": "= 0.5 VIN access",
    "pricing.credit5.type": "Documented exchange with seller",
    "pricing.credit5.points": "15 points",
    "pricing.credit5.access": "= 1.5 VIN accesses",
    "pricing.creditsNote": "10 points = 1 full VIN access. Points never expire.",
    "pricing.faqTitle": "Why this model?",
    "pricing.faqDesc": "VLINKS works thanks to the community. Access fees help maintain the platform and reward contributors. The more you contribute, the less you pay.",
    "pricing.tableType": "Contribution type",
    "pricing.tablePoints": "Points",
    "pricing.tableEquivalent": "Equivalent",

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
