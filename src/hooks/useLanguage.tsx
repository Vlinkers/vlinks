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

    // Pricing Page
    "pricing.title": "Accès transparent,",
    "pricing.titleGradient": "philosophie communautaire",
    "pricing.subtitle": "VLINKS existe pour réduire l'opacité du marché du véhicule d'occasion et protéger les acheteurs. Votre accès soutient les contributeurs qui partagent leurs découvertes.",
    
    // Free Access Section
    "pricing.free.title": "Accès gratuit",
    "pricing.free.desc": "La recherche de VIN est toujours gratuite. Voir si des informations existent sur un véhicule est gratuit. Vous ne payez que pour débloquer les contributions détaillées.",
    "pricing.free.f1": "Recherche de VIN illimitée",
    "pricing.free.f2": "Voir si des informations existent",
    "pricing.free.f3": "Payer uniquement pour débloquer",
    
    // Unlock VIN Section
    "pricing.unlock.title": "Accès par VIN",
    "pricing.unlock.cardTitle": "Débloquer un dossier VIN",
    "pricing.unlock.perVin": "CAD",
    "pricing.unlock.f1": "Rapports d'inspection",
    "pricing.unlock.f2": "Historiques de véhicule (Carfax, etc.)",
    "pricing.unlock.f3": "Communications avec le vendeur",
    "pricing.unlock.f4": "Retours de mécaniciens",
    "pricing.unlock.f5": "Notes et alertes communautaires",
    "pricing.unlock.cta": "Débloquer ce VIN",
    "pricing.unlock.support": "Votre accès soutient les contributeurs qui ont partagé leurs découvertes.",
    
    // Credit Packs Section
    "pricing.packs.title": "Paquets de crédits",
    "pricing.packs.desc": "Les crédits peuvent débloquer des dossiers VIN. Les crédits peuvent aussi être gagnés en contribuant. Plus vous contribuez, moins vous payez.",
    "pricing.packs.bestValue": "Meilleure valeur",
    "pricing.packs.credits": "crédits",
    "pricing.packs.cta": "Obtenir des crédits",
    "pricing.packs.note": "1 crédit = 1 dossier VIN débloqué. Les crédits n'expirent jamais.",
    "pricing.pack1.name": "Découverte",
    "pricing.pack1.price": "14,90 $ CAD",
    "pricing.pack2.name": "Acheteur sérieux",
    "pricing.pack2.price": "24,90 $ CAD",
    "pricing.pack3.name": "Contributeur",
    "pricing.pack3.price": "44,90 $ CAD",
    
    // Earn Credits Section
    "pricing.earn.title": "Gagnez des crédits en contribuant",
    "pricing.earn.desc": "Vous avez des informations sur un véhicule ? Partagez-les et gagnez des crédits qui réduisent ou éliminent le besoin de payer.",
    "pricing.earn.inspection": "Rapports d'inspection",
    "pricing.earn.history": "Historiques de véhicule",
    "pricing.earn.seller": "Communications avec le vendeur",
    "pricing.earn.mechanic": "Retours de mécaniciens",
    "pricing.earn.cta": "Commencer à contribuer",
    
    // Philosophy Section
    "pricing.philosophy.title": "Pourquoi ce modèle ?",
    "pricing.philosophy.desc": "VLINKS fonctionne grâce à la communauté. Les frais d'accès permettent de maintenir la plateforme et de récompenser les contributeurs qui partagent leurs découvertes. Plus vous contribuez, moins vous payez.",

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

    // Pricing Page
    "pricing.title": "Transparent access,",
    "pricing.titleGradient": "community-first philosophy",
    "pricing.subtitle": "VLINKS exists to reduce opacity in the used vehicle market and protect buyers. Your access supports contributors who share their findings.",
    
    // Free Access Section
    "pricing.free.title": "Free access",
    "pricing.free.desc": "VIN search is always free. Seeing whether information exists on a vehicle is free. You only pay to unlock detailed contributions.",
    "pricing.free.f1": "Unlimited VIN search",
    "pricing.free.f2": "See if information exists",
    "pricing.free.f3": "Pay only to unlock",
    
    // Unlock VIN Section
    "pricing.unlock.title": "Pay per VIN",
    "pricing.unlock.cardTitle": "Unlock a VIN dossier",
    "pricing.unlock.perVin": "CAD",
    "pricing.unlock.f1": "Inspection reports",
    "pricing.unlock.f2": "Vehicle history reports (e.g. Carfax)",
    "pricing.unlock.f3": "Seller communications",
    "pricing.unlock.f4": "Mechanic feedback",
    "pricing.unlock.f5": "Community notes and alerts",
    "pricing.unlock.cta": "Unlock this VIN",
    "pricing.unlock.support": "Your access supports contributors who shared their findings.",
    
    // Credit Packs Section
    "pricing.packs.title": "Credit packs",
    "pricing.packs.desc": "Credits can unlock VIN dossiers. Credits can also be earned by contributing. Contributions reduce or eliminate the need to pay.",
    "pricing.packs.bestValue": "Best value",
    "pricing.packs.credits": "credits",
    "pricing.packs.cta": "Get credits",
    "pricing.packs.note": "1 credit = 1 VIN dossier unlocked. Credits never expire.",
    "pricing.pack1.name": "Discovery Pack",
    "pricing.pack1.price": "$14.90 CAD",
    "pricing.pack2.name": "Serious Buyer Pack",
    "pricing.pack2.price": "$24.90 CAD",
    "pricing.pack3.name": "Contributor Pack",
    "pricing.pack3.price": "$44.90 CAD",
    
    // Earn Credits Section
    "pricing.earn.title": "Earn credits by contributing",
    "pricing.earn.desc": "Have information about a vehicle? Share it and earn credits that reduce or eliminate the need to pay.",
    "pricing.earn.inspection": "Inspection reports",
    "pricing.earn.history": "Vehicle history reports",
    "pricing.earn.seller": "Seller communications",
    "pricing.earn.mechanic": "Mechanic insights",
    "pricing.earn.cta": "Start contributing",
    
    // Philosophy Section
    "pricing.philosophy.title": "Why this model?",
    "pricing.philosophy.desc": "VLINKS works thanks to the community. Access fees help maintain the platform and reward contributors who share their discoveries. The more you contribute, the less you pay.",

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
