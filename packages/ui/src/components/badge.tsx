import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  // Neobrutalism badge - bold and punchy
  [
    "inline-flex items-center justify-center",
    "font-heading text-xs font-bold uppercase tracking-wider",
    "border-2 border-black rounded-sm",
    "px-3 py-1",
    "whitespace-nowrap",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-neo-sm",
        secondary: "bg-white text-foreground shadow-neo-sm",
        success: "bg-green-500 text-white shadow-neo-sm",
        warning: "bg-amber-400 text-black shadow-neo-sm",
        error: "bg-destructive text-destructive-foreground shadow-neo-sm",
        info: "bg-cyan-500 text-white shadow-neo-sm",
        // Pastel variants
        yellow: "bg-surface-yellow text-foreground shadow-neo-sm",
        blue: "bg-surface-blue text-foreground shadow-neo-sm",
        pink: "bg-surface-pink text-foreground shadow-neo-sm",
        mint: "bg-surface-mint text-foreground shadow-neo-sm",
        lavender: "bg-surface-lavender text-foreground shadow-neo-sm",
        // Outline variants
        outline: "bg-transparent text-foreground shadow-none",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
