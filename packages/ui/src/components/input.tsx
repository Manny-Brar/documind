import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const inputVariants = cva(
  // Base neobrutalism input
  [
    "flex w-full",
    "bg-white text-foreground",
    "border-2 border-black rounded-sm",
    "px-4 py-2",
    "text-base font-body",
    "placeholder:text-muted-foreground",
    "transition-all duration-100",
    // Focus state - lift and emphasize
    "focus-visible:outline-none",
    "focus-visible:-translate-x-0.5 focus-visible:-translate-y-0.5",
    "focus-visible:shadow-neo focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    // Disabled state
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale",
    // File inputs
    "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
  ],
  {
    variants: {
      variant: {
        default: "shadow-neo-sm",
        ghost: "border-transparent shadow-none focus-visible:border-black",
        error: [
          "border-destructive",
          "shadow-neo-error",
          "bg-red-50",
          "focus-visible:ring-destructive",
        ],
      },
      inputSize: {
        default: "h-11",
        sm: "h-9 text-sm px-3",
        lg: "h-14 text-lg px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          inputVariants({
            variant: error ? "error" : variant,
            inputSize,
            className,
          })
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
