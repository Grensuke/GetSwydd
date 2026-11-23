import React from "react";
import { cn } from "@/lib/cn";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "narrow" | "wide";
}

export function PageContainer({
  size = "default",
  className,
  children,
  ...props
}: PageContainerProps) {
  const maxWidth = {
    narrow: "max-w-3xl",
    default: "max-w-[1200px]",
    wide: "max-w-[1440px]",
  }[size];

  return (
    <div
      className={cn(
        "w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-page-enter",
        maxWidth,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
