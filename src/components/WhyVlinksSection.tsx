const WhyVlinksSection = () => {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-6">
          Pourquoi VLINKS ?
        </h2>
        <div className="space-y-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
          <p>
            Le marché du véhicule d'occasion manque souvent d'informations terrain. 
            VLINKS organise ces informations dans des dossiers VIN consultables, 
            enrichis par les contributions de la communauté.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-lg bg-card border border-border">
              <p className="text-sm font-medium text-foreground">
                Chaque contribution enrichit un dossier
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <p className="text-sm font-medium text-foreground">
                La valeur repose sur les Vlinkers
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <p className="text-sm font-medium text-foreground">
                Une photo ou un document peut aider l'acheteur suivant
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyVlinksSection;
