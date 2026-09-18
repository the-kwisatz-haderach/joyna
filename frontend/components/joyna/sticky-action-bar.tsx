import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * White footer bar, separated by a top border, pinned to the bottom of
 * the screen (or of a scroll container — position it with `sticky bottom-0`
 * or `fixed` depending on your layout). Holds one full-width button, or
 * a Cancel/primary pair.
 */
export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "flex gap-2.5 border-t border-joyna-border bg-white px-5 pb-5 pt-3.5",
        className
      )}
    >
      {children}
    </div>
  );
}
