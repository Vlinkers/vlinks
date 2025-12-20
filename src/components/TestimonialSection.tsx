import { Star, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const testimonials = [
  {
    name: "Marc Tremblay",
    role: "Acheteur vérifié",
    location: "Montréal, QC",
    avatar: "MT",
    rating: 5,
    text: "Grâce à VLINKS, j'ai découvert que le véhicule avait eu un problème de transmission non déclaré. Le vendeur ne voulait rien dire, mais la communauté m'a sauvé d'un mauvais achat!",
    badge: "verified",
  },
  {
    name: "Sophie Lavoie",
    role: "Contributrice Gold",
    location: "Québec, QC",
    avatar: "SL",
    rating: 5,
    text: "J'ai partagé mon rapport d'inspection et les détails de mon achat. 6 mois plus tard, quelqu'un m'a remercié d'avoir évité une arnaque grâce à mes infos. Ça fait du bien d'aider!",
    badge: "premium",
  },
  {
    name: "Jean-François Roy",
    role: "Inspecteur certifié",
    location: "Laval, QC",
    avatar: "JR",
    rating: 5,
    text: "La marketplace d'inspecteurs m'a permis de développer ma clientèle. Les acheteurs sont rassurés par les avis et je peux offrir un service de qualité. Tout le monde y gagne.",
    badge: "verified",
  },
];

const TestimonialSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Ce que dit la <span className="text-gradient">communauté</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Des milliers d'acheteurs nous font confiance pour prendre des décisions éclairées.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-8 rounded-2xl glass hover:shadow-elevated transition-all duration-300 group"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/20" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground/90 leading-relaxed mb-6">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {testimonial.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{testimonial.name}</span>
                    <Badge variant={testimonial.badge as "verified" | "premium"}>
                      {testimonial.badge === "verified" ? "Vérifié" : "Gold"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} • {testimonial.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
