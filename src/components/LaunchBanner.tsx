import { Rocket } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";


const LaunchBanner = () => {
  const { t } = useLanguage();
  
  return (
    <div className="bg-primary/10 border-b border-primary/20 py-2 px-4 text-center text-sm">
      <div className="container mx-auto flex items-center justify-center gap-2">
        <Rocket className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-foreground/90">
          {t("launch.banner")}
        </span>
      </div>
    </div>
  );
};

export default LaunchBanner;
