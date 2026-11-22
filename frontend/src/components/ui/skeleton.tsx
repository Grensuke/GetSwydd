import React from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Skeleton({ rounded = "md", className, ...props }: SkeletonProps) {
  const roundedClass = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      className={cn(
        "bg-sage-soft/50 animate-pulse relative overflow-hidden",
        roundedClass,
        className
      )}
      {...props}
    />
  );
}

