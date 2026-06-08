import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sage-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        variant === "primary" && "bg-sage-800 text-white hover:bg-sage-900",
        variant === "secondary" && "border border-sage-700 bg-sage-100 text-black hover:bg-sage-200",
        variant === "ghost" && "text-black hover:bg-sage-100",
        className
      )}
      {...props}
    />
  );
}
