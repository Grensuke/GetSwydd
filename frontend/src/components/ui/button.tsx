import Link from "next/link";
import React, { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper hover:bg-ink-soft active:bg-ink border border-transparent shadow-[0_1px_0_rgba(43,47,39,0.1)] disabled:bg-sage-soft disabled:text-ink-soft disabled:opacity-100 disabled:hover:bg-sage-soft",
  secondary:
    "bg-paper-raised text-ink border border-control-border hover:bg-paper active:bg-sage-soft/40",
  quiet:
    "bg-transparent text-ink border-transparent hover:underline hover:text-ink-soft active:text-ink p-0",
  danger:
    "bg-paper-raised text-brick border border-brick/40 hover:bg-brick-tint/60 active:bg-brick-tint",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-xs px-2.5 py-1 rounded-md gap-1.5",
  md: "text-sm px-3.5 py-1.5 rounded-md gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    href,
    icon,
    disabled,
    className,
    children,
    type = "button",
    ...props
  },
  ref
) {
  const isQuiet = variant === "quiet";
  const classes = cn(
    "inline-flex items-center justify-center font-medium transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none",
    variantStyles[variant],
    !isQuiet && sizeStyles[size],
    isQuiet && "text-sm",
    className
  );

  const spinner = (
    <span
      className="inline-block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin shrink-0"
      aria-hidden="true"
    />
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {loading ? spinner : icon}
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={classes}
      {...props}
    >
      {loading ? spinner : icon}
      {children}
    </button>
  );
});

