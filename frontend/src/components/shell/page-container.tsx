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
        "mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        maxWidth,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
