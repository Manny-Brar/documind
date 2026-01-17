import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const chartCardVariants = cva(
  // Neobrutalism chart card
  [
    "border-2 border-black rounded-sm",
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

export interface ChartCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chartCardVariants> {
  title: string;
  description?: string;
  loading?: boolean;
  action?: React.ReactNode;
}

const ChartCard = React.forwardRef<HTMLDivElement, ChartCardProps>(
  ({ className, variant, title, description, loading, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(chartCardVariants({ variant }), className)}
        {...props}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b-2 border-black">
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>

        {/* Chart Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="h-8 w-8 animate-spin border-4 border-black border-t-transparent" />
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    );
  }
);
ChartCard.displayName = "ChartCard";

export { ChartCard, chartCardVariants };
