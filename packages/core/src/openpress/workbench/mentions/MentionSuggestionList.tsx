import type { ComposerMentionItem } from "./useComposerMentions";

export interface MentionSuggestionListProps {
  className: string;
  classNames?: {
    item?: string;
    label?: string;
    meta?: string;
  };
  suggestions: ComposerMentionItem[];
  highlightedIndex: number;
  ariaLabel: string;
  onHighlight: (index: number) => void;
  onSelect: (item: ComposerMentionItem) => void;
}

export function MentionSuggestionList({
  className,
  classNames,
  suggestions,
  highlightedIndex,
  ariaLabel,
  onHighlight,
  onSelect,
}: MentionSuggestionListProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={className} role="listbox" aria-label={ariaLabel}>
      {suggestions.map((item, index) => (
        <button
          type="button"
          className={classNames?.item}
          role="option"
          aria-selected={index === highlightedIndex}
          data-highlighted={index === highlightedIndex ? "true" : undefined}
          key={`${item.kind}-${item.value}`}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => onHighlight(index)}
          onClick={() => onSelect(item)}
        >
          <span className={classNames?.label}>{item.label}</span>
          <small className={classNames?.meta}>{item.meta}</small>
        </button>
      ))}
    </div>
  );
}
