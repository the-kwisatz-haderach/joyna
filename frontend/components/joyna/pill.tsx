import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium font-body",
  {
    variants: {
      tone: {
        mint: "bg-joyna-mint/20 text-joyna-mint-dark",
        bubblegum: "bg-joyna-bubblegum/25 text-joyna-bubblegum-dark",
        sunflower: "bg-joyna-sunflower/25 text-joyna-sunflower-dark",
        periwinkle: "bg-joyna-periwinkle/15 text-joyna-periwinkle-dark",
        red: "bg-joyna-red/15 text-joyna-red-dark",
        muted: "bg-joyna-border-strong text-joyna-ink-soft",
      },
    },
    defaultVariants: {
      tone: "periwinkle",
    },
  }
);

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

/**
 * Usage:
 *   <Pill tone="mint">Going</Pill>
 *   <Pill tone="sunflower">RSVP in 5 days</Pill>
 *   <Pill tone="muted">🔒 RSVP closed</Pill>
 *
 * Tone mapping is fixed app-wide, not per-instance:
 *   mint = positive, bubblegum = soft decline, sunflower = warning/deadline,
 *   periwinkle = info/tag, red = hard-destructive, muted = disabled/closed.
 */
export function Pill({ className, tone, ...props }: PillProps) {
  return <span className={cn(pillVariants({ tone }), className)} {...props} />;
}
