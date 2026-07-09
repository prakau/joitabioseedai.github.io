import * as React from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-md border border-sage-300 bg-white px-4 py-2.5 text-base font-semibold text-black outline-none focus:border-sage-700 focus:ring-2 focus:ring-sage-200",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-sage-300 bg-white px-4 py-3 text-base font-semibold text-black outline-none focus:border-sage-700 focus:ring-2 focus:ring-sage-200",
        className
      )}
      {...props}
    />
  );
}
