import React from "react";
import { cn } from "@/lib/cn";

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  variant?: "single" | "double";
}

export function Divider({ variant = "single", className, ...props }: DividerProps) {
  if (variant === "double") {
    return (
      <div
        role="separator"
        className={cn("h-[4px] border-y border-hairline my-6", className)}
        {...props}
      />
    );
  }

  return (
    <hr
      className={cn("border-t border-hairline my-6", className)}
      {...props}
    />
  );
}

