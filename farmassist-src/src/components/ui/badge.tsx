import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm bg-sage-100 px-2 py-1 text-xs font-bold text-sage-900", className)}>
      {children}
    </span>
  );
}
