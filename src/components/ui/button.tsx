import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "focus-ring inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[transform,background-color,border-color,box-shadow,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-violet-500 via-violet-600 to-fuchsia-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_40px_-14px_rgba(139,92,246,0.8)] hover:brightness-110 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_16px_50px_-12px_rgba(139,92,246,0.9)]",
        secondary:
          "border border-white/10 bg-white/[0.055] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md hover:border-white/20 hover:bg-white/[0.09]",
        outline:
          "border border-white/12 bg-transparent text-slate-200 hover:border-white/25 hover:bg-white/[0.05] hover:text-white",
        ghost: "text-slate-300 hover:bg-white/[0.06] hover:text-white",
        cyan:
          "bg-cyan-400/15 text-cyan-200 ring-1 ring-inset ring-cyan-300/30 hover:bg-cyan-400/20 hover:text-cyan-100",
        emerald:
          "bg-emerald-400/15 text-emerald-200 ring-1 ring-inset ring-emerald-300/30 hover:bg-emerald-400/20",
        danger:
          "bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-400/30 hover:bg-rose-500/25 hover:text-rose-100",
        link: "h-auto rounded-none p-0 text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-12 px-6 text-lg",
        icon: "h-10 w-10 p-0",
        iconSm: "h-8 w-8 rounded-lg p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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

export { buttonVariants };
