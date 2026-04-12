import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const CONSENT_KEY = "vlinks_consent";

interface ConsentValue {
  functional: boolean;
  analytics: boolean;
  timestamp: string;
}

const ConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const saveConsent = (analytics: boolean) => {
    const value: ConsentValue = {
      functional: true,
      analytics,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1 text-sm text-muted-foreground">
          <p>
            Ce site utilise des cookies fonctionnels nécessaires à son bon fonctionnement. 
            Conformément à la <strong>Loi 25 du Québec</strong>, nous demandons votre consentement 
            pour les cookies d'analyse qui nous aident à améliorer le service. 
            <a href="/politique-confidentialite" className="text-primary underline ml-1">
              Politique de confidentialité
            </a>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => saveConsent(false)}>
            Refuser
          </Button>
          <Button size="sm" onClick={() => saveConsent(true)}>
            Accepter tout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
