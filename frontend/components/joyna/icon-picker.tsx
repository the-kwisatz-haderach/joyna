import { cn } from "@/lib/utils";

export const DEFAULT_TEMPLATE_ICONS = ["🍻", "🎲", "🥳", "🍿", "☕", "🎂"];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  icons?: string[];
}

/** Grid of selectable emoji, matching MoodPicker's tile styling but icon-only. */
export function IconPicker({ value, onChange, icons = DEFAULT_TEMPLATE_ICONS }: IconPickerProps) {
  return (
    <div role="radiogroup" aria-label="Icon" className="flex flex-wrap gap-2">
      {icons.map((icon) => {
        const selected = icon === value;
        return (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${icon} icon`}
            onClick={() => onChange(icon)}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-joyna-border-strong bg-white text-lg",
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
