import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const statsCardVariants = cva(
  // Neobrutalism stats card
  [
    "border-2 border-black rounded-sm",
    "p-6",
    "shadow-neo",
    "transition-all duration-100",
  ],
  {
    variants: {
      variant: {
        default: "bg-white",
        yellow: "bg-surface-yellow",
        blue: "bg-surface-blue",
        pink: "bg-surface-pink",
        mint: "bg-surface-mint",
        lavender: "bg-surface-lavender",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface StatsCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statsCardVariants> {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ className, variant, label, value, trend, icon, ...props }, ref) => {
    const isPositive = trend?.value && trend.value > 0;
    const isNegative = trend?.value && trend.value < 0;

    return (
      <div
        ref={ref}
        className={cn(statsCardVariants({ variant }), className)}
        {...props}
      >
        {/* Header with label and icon */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {icon && (
            <span className="text-muted-foreground">{icon}</span>
          )}
        </div>

        {/* Value - Big and bold */}
        <div className="font-mono text-4xl font-bold tracking-tight text-foreground animate-count-up">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>

        {/* Trend indicator */}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <span
              className={cn(
                "text-sm font-bold",
                isPositive && "text-green-600",
                isNegative && "text-red-600",
                !isPositive && !isNegative && "text-muted-foreground"
              )}
            >
              {isPositive && "↑"}
              {isNegative && "↓"}
              {Math.abs(trend.value)}%
            </span>
            {trend.label && (
              <span className="text-xs text-muted-foreground">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
StatsCard.displayName = "StatsCard";

export { StatsCard, statsCardVariants };
