import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "fr" ? "en" : "fr");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 text-muted-foreground hover:text-foreground"
    >
      <Globe className="w-4 h-4" />
      <span className="uppercase font-medium">{language === "fr" ? "EN" : "FR"}</span>
    </Button>
  );
};

export default LanguageSwitcher;
