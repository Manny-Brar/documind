import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils.js";

const buttonVariants = cva(
  // Base styles - Neobrutalism foundation
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-heading text-sm font-bold uppercase tracking-wider",
    "border-2 border-black rounded-sm",
    "transition-all duration-100",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-primary",
    "disabled:pointer-events-none disabled:opacity-40 disabled:grayscale",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    // Hover lift effect
    "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg",
    // Active press effect
    "active:translate-x-px active:translate-y-px active:shadow-neo-pressed",
  ],
  {
    variants: {
      variant: {
        // Primary - Bold blue
        default: [
          "bg-primary text-primary-foreground",
          "shadow-neo",
        ],
        // Secondary - White with black border
        secondary: [
          "bg-white text-black",
          "shadow-neo",
          "hover:bg-gray-50",
        ],
        // Destructive - Bold red
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-neo",
        ],
        // Ghost - Transparent with border
        ghost: [
          "bg-transparent text-black",
          "shadow-none border-transparent",
          "hover:bg-accent hover:border-black hover:shadow-neo-sm",
          "active:shadow-none",
        ],
        // Outline - White bg with shadow
        outline: [
          "bg-white text-black",
          "shadow-neo-sm",
        ],
        // Accent - Hot pink
        accent: [
          "bg-pink-500 text-white",
          "shadow-neo",
        ],
        // Success - Green
        success: [
          "bg-green-600 text-white",
          "shadow-neo",
        ],
        // Link - Underline style
        link: [
          "bg-transparent text-primary",
          "border-0 shadow-none",
          "underline-offset-4 hover:underline",
          "hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
          "active:translate-x-0 active:translate-y-0",
        ],
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin border-2 border-current border-t-transparent" />
            <span className="sr-only">Loading...</span>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
