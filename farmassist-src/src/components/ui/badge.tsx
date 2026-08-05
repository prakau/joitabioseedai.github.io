import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-md bg-sage-100 px-3.5 py-2 text-lg font-bold text-sage-900 transition", className)}>
      {children}
    </span>
  );
}
