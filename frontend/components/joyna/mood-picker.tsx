import { cn } from "@/lib/utils";

export interface Mood {
  id: string;
  label: string;
  emoji: string;
}

export const DEFAULT_MOODS: Mood[] = [
  { id: "chill", label: "Chill", emoji: "😌" },
  { id: "fun", label: "Fun", emoji: "🎉" },
  { id: "party", label: "Party", emoji: "🥳" },
  { id: "cozy", label: "Cozy", emoji: "☕" },
  { id: "adventure", label: "Adventure", emoji: "🧭" },
  { id: "romantic", label: "Romantic", emoji: "💕" },
  { id: "competitive", label: "Competitive", emoji: "🏆" },
  { id: "low-key", label: "Low-key", emoji: "😴" },
];

interface MoodPickerProps {
  value: string;
  onChange: (moodId: string) => void;
  moods?: Mood[];
}

/** 4-column grid, every tile the same fixed size regardless of label length. */
export function MoodPicker({ value, onChange, moods = DEFAULT_MOODS }: MoodPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {moods.map((m) => {
        const selected = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={cn(
              "flex h-[68px] flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-joyna-border-strong bg-white px-1 text-center text-[11px] leading-tight text-joyna-ink-soft",
              selected && "border-joyna-periwinkle bg-joyna-periwinkle/10 font-semibold text-joyna-periwinkle-dark"
            )}
          >
            <span className="text-lg">{m.emoji}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
