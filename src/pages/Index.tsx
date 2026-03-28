import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SocialProofSection from "@/components/SocialProofSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhyVlinksSection from "@/components/WhyVlinksSection";
import WhatYouCanFindSection from "@/components/WhatYouCanFindSection";
import DossierExamplesSection from "@/components/DossierExamplesSection";
import CommunitySection from "@/components/CommunitySection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  const [heroVisible, setHeroVisible] = useState(true);

  return (
    <>
      <SEO
        title="VLINKS - Dossier véhicule communautaire"
        description="Consultez le dossier d'un véhicule à partir de son VIN. Documents, photos, historique et observations partagés par la communauté des Vlinkers."
        canonical="https://vlinks.ca"
      />
      <div className="min-h-screen bg-background">
        <Header hideSearch={heroVisible} />
        <main>
          <HeroSection onVisibilityChange={setHeroVisible} />
          <SocialProofSection />
          <HowItWorksSection />
          <WhyVlinksSection />
          <WhatYouCanFindSection />
          <DossierExamplesSection />
          <CommunitySection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
