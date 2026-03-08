import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SocialProofSection from "@/components/SocialProofSection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <>
      <SEO
        title="VLINKS - Dossier véhicule communautaire"
        description="Consultez les contributions, documents, photos et signaux partagés par la communauté pour tout véhicule d'occasion. Recherchez par VIN."
        canonical="https://vlinks.ca"
      />
      <div className="min-h-screen bg-background">
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
