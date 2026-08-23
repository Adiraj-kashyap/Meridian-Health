import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-pine-700 text-paper hover:bg-pine-900 shadow-soft",
  secondary: "bg-terracotta-700 text-paper hover:bg-terracotta-800 shadow-soft",
  ghost: "bg-transparent text-pine-700 hover:bg-sage-100 border border-pine-700/20",
  danger: "bg-clay-400 text-paper hover:bg-clay-600",
};
const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg",
  md: "text-[0.95rem] px-4 py-2.5 rounded-xl",
  lg: "text-base px-6 py-3.5 rounded-xl",
};

/** Shared class recipe so non-<button> elements (e.g. router <Link>) can
 *  look identical to Button without a Radix-style asChild indirection. */
export function buttonClasses(variant: Variant = "primary", size: Size = "md", className = "") {
  return clsx(
    "inline-flex items-center justify-center gap-2 font-medium cursor-pointer transition-all duration-200",
    "active:scale-[0.98]",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium cursor-pointer transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
