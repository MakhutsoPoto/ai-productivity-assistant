import { Sparkles, PenLine } from "lucide-react";

export function PromptChips<T>({
  examples,
  onPick,
  onCustom,
  labelOf,
}: {
  examples: T[];
  onPick: (item: T) => void;
  onCustom?: () => void;
  labelOf: (item: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3" /> Try:
      </span>
      {examples.map((ex, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(ex)}
          className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground/80 transition hover:bg-muted"
        >
          {labelOf(ex)}
        </button>
      ))}
      {onCustom && (
        <button
          type="button"
          onClick={onCustom}
          className="inline-flex items-center gap-1 rounded-full bg-[#4b5563] px-3 py-1 text-xs text-white hover:bg-[#374151]"
        >
          <PenLine className="h-3 w-3" /> Write your own
        </button>
      )}
    </div>
  );
}
