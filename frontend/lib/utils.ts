import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge's default config only knows Tailwind's built-in radius
// scale (rounded-sm/md/lg/xl/...). It can't see the custom rounded-card/
// rounded-control/rounded-field utilities generated from this project's
// --radius-card/--radius-control/--radius-field theme keys (src/index.css),
// so without this they aren't recognized as conflicting with rounded-md
// and both survive the merge — whichever lands later in Tailwind's
// compiled CSS wins, not whichever was meant to override.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: ["rounded-card", "rounded-control", "rounded-field"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
