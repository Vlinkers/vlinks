import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SocialProofSection from "@/components/SocialProofSection";
import Footer from "@/components/Footer";
import LaunchBanner from "@/components/LaunchBanner";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <>
      <SEO
        title="VLINKS - La vérité est une chaîne. Vous êtes le maillon."
        description="Plateforme communautaire d'historique véhicule. Accédez aux avis, inspections et rapports partagés par la communauté pour acheter votre véhicule d'occasion en toute confiance."
        canonical="https://vlinks.ca"
      />
      <div className="min-h-screen bg-background">
        <LaunchBanner />
        <Header />
        <main>
          <HeroSection />
          <SocialProofSection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
