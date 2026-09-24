import { cn } from "@/lib/utils";

export const DEFAULT_TEMPLATE_ICONS = ["🍻", "🎲", "🥳", "🍿", "☕", "🎂", "🍕", "🎬", "🎵", "⚽", "🌅", "🎨"];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  icons?: string[];
}

/** Horizontally scrollable row of selectable emoji. Picking an already-selected icon clears it, since the icon is optional. */
export function IconPicker({ value, onChange, icons = DEFAULT_TEMPLATE_ICONS }: IconPickerProps) {
  return (
    <div role="radiogroup" aria-label="Icon" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {icons.map((icon) => {
        const selected = icon === value;
        return (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${icon} icon`}
            onClick={() => onChange(selected ? "" : icon)}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-joyna-border-strong bg-white text-xl",
              selected && "border-joyna-periwinkle bg-joyna-periwinkle/10"
            )}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
