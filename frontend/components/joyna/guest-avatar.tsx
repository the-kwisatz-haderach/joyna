import { cn } from "@/lib/utils";

export type GuestAvatarVariant = "default" | "host" | "stranger" | "network-added";

export interface GuestAvatarProps {
  /** Full name — initials are derived from this. */
  name: string;
  variant?: GuestAvatarVariant;
  /** Optional photo URL; falls back to initials when absent. */
  src?: string;
  className?: string;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Three meaningful states beyond the default in-network look:
 * - `host`: sunflower fill, crown-tier guest
 * - `stranger`: dashed border, muted fill — invited but outside the
 *   viewer's network
 * - `network-added`: solid periwinkle border — the brief confirmation
 *   state right after tapping "Add to network", before the tag resolves
 *   to a real group name
 */
export function GuestAvatar({ name, variant = "default", src, className }: GuestAvatarProps) {
  return (
    <div
      className={cn(
        "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold overflow-hidden",
        variant === "default" && "bg-joyna-periwinkle text-white",
        variant === "host" && "bg-joyna-sunflower text-joyna-sunflower-dark",
        variant === "stranger" &&
          "border-[1.5px] border-dashed border-joyna-ink-faint bg-[#EEE6D8] text-joyna-ink-soft",
        variant === "network-added" &&
          "border-2 border-joyna-periwinkle-dark bg-joyna-periwinkle text-white",
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
