import { cn } from "@/lib/utils";

export interface Mood {
  id: string;
  label: string;
}

export const DEFAULT_MOODS: Mood[] = [
  { id: "chill", label: "Chill" },
  { id: "fun", label: "Fun" },
  { id: "party", label: "Party" },
  { id: "cozy", label: "Cozy" },
  { id: "adventure", label: "Adventure" },
  { id: "romantic", label: "Romantic" },
  { id: "competitive", label: "Competitive" },
  { id: "low-key", label: "Low-key" },
  { id: "social", label: "Social" },
  { id: "celebration", label: "Celebration" },
  { id: "formal", label: "Formal" },
  { id: "learning", label: "Learning" },
];

interface MoodPickerProps {
  value: string[];
  onChange: (moodIds: string[]) => void;
  moods?: Mood[];
}

/** Wrapping row of toggleable chips — any number of moods can be selected at once. */
export function MoodPicker({ value, onChange, moods = DEFAULT_MOODS }: MoodPickerProps) {
  function toggle(moodId: string) {
    if (value.includes(moodId)) {
      onChange(value.filter((id) => id !== moodId));
    } else {
      onChange([...value, moodId]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {moods.map((m) => {
        const selected = value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(m.id)}
            className={cn(
              "rounded-full border-[1.5px] border-joyna-border-strong bg-white px-4 py-2 font-display text-sm font-semibold text-joyna-ink-soft",
              selected && "border-joyna-periwinkle bg-joyna-periwinkle text-white"
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
