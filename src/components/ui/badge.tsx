import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        verified: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        danger: "border-danger/30 bg-danger/10 text-danger",
        info: "border-primary/30 bg-primary/10 text-primary",
        premium: "border-accent/30 bg-accent/10 text-accent",
        // Contribution type semantic badges
        inspection: "border-[#15803D]/20 bg-[#DCFCE7] text-[#15803D]",
        signal: "border-[#92400E]/20 bg-[#FEF3C7] text-[#92400E]",
        accident: "border-[#B91C1C]/20 bg-[#FEE2E2] text-[#B91C1C]",
        photo: "border-[#7E22CE]/20 bg-[#F3E8FF] text-[#7E22CE]",
        document: "border-[#475569]/20 bg-[#F1F5F9] text-[#475569]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
