import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-md bg-sage-100 px-2.5 py-1 text-sm font-bold text-sage-900 transition", className)}>
      {children}
    </span>
  );
}
