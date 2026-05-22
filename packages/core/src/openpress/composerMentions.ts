import { useEffect, useMemo, useState, type KeyboardEvent, type RefObject } from "react";

export type ComposerMentionItem = {
  trigger: "@" | "/";
  value: string;
  label: string;
  meta: string;
  kind: "media" | "component" | "skill" | "chapter" | "section" | "prefix";
};

export type ActiveComposerMention = {
  trigger: "@" | "/";
  query: string;
  start: number;
  end: number;
};

export function useComposerMentions({
  text,
  items,
  textareaRef,
  onTextChange,
  enabled = true,
  maxSuggestions = 7,
}: {
  text: string;
  items: ComposerMentionItem[];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onTextChange: (value: string) => void;
  enabled?: boolean;
  maxSuggestions?: number;
}) {
  const [composerCursor, setComposerCursor] = useState(0);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);
  const [dismissedMentionKey, setDismissedMentionKey] = useState<string | null>(null);
  const activeMention = enabled ? resolveComposerMention(text, composerCursor) : null;
  const mentionKey = activeMention ? `${activeMention.trigger}:${activeMention.start}:${activeMention.query}` : null;
  const mentionSuggestions = useMemo(() => {
    if (!activeMention) return [];
    if (mentionKey && dismissedMentionKey === mentionKey) return [];
    return createMentionSuggestions(activeMention, items, maxSuggestions);
  }, [activeMention, dismissedMentionKey, items, maxSuggestions, mentionKey]);

  useEffect(() => {
    setHighlightedMentionIndex(0);
  }, [mentionKey, mentionSuggestions.length]);

  const syncCursor = () => {
    const textarea = textareaRef.current;
    if (textarea) setComposerCursor(textarea.selectionStart ?? text.length);
  };

  const insertMention = (item: ComposerMentionItem) => {
    if (!activeMention) return;
    const suffix = item.kind === "prefix" ? "" : " ";
    const nextText = `${text.slice(0, activeMention.start)}${item.value}${suffix}${text.slice(activeMention.end)}`;
    const nextCursor = activeMention.start + item.value.length + suffix.length;
    setDismissedMentionKey(null);
    onTextChange(nextText);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      setComposerCursor(nextCursor);
    });
  };

  const handleMentionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeMention || mentionSuggestions.length === 0) return false;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedMentionIndex((index) => (index + 1) % mentionSuggestions.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedMentionIndex((index) => (index - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertMention(mentionSuggestions[highlightedMentionIndex] ?? mentionSuggestions[0]);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDismissedMentionKey(mentionKey);
      return true;
    }
    return false;
  };

  return {
    activeMention,
    handleMentionKeyDown,
    highlightedMentionIndex,
    setHighlightedMentionIndex,
    mentionSuggestions,
    setComposerCursor,
    syncCursor,
    insertMention,
  };
}

export function appendComposerToken(text: string, token: string) {
  const trimmedToken = token.trim();
  if (!trimmedToken) return text;
  if (!text.trim()) return `${trimmedToken} `;
  return `${text.replace(/\s*$/, " ")}${trimmedToken} `;
}

export function createMentionSuggestions(
  activeMention: ActiveComposerMention,
  items: ComposerMentionItem[],
  maxSuggestions: number,
) {
  if (activeMention.trigger === "@") {
    const prefixItems = createMentionPrefixItems(items);
    const normalizedQuery = activeMention.query.trim().toLowerCase();
    if (!normalizedQuery) return prefixItems.slice(0, maxSuggestions);
    if (!normalizedQuery.includes("/")) {
      return uniqueMentionItems([
        ...prefixItems.filter((item) => mentionMatches(item, normalizedQuery)),
        ...items.filter((item) => item.trigger === "@" && mentionMatches(item, normalizedQuery)),
      ]).slice(0, maxSuggestions);
    }
  }

  return items
    .filter((item) => item.trigger === activeMention.trigger && mentionMatches(item, activeMention.query))
    .slice(0, maxSuggestions);
}

function createMentionPrefixItems(items: ComposerMentionItem[]): ComposerMentionItem[] {
  const availableKinds = new Set(items.filter((item) => item.trigger === "@").map((item) => item.kind));
  return MENTION_PREFIX_DEFINITIONS
    .filter((item) => availableKinds.has(item.kind))
    .map((item) => ({
      trigger: "@" as const,
      value: `@${item.kind}/`,
      label: item.kind,
      meta: item.meta,
      kind: "prefix" as const,
    }));
}

function uniqueMentionItems(items: ComposerMentionItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveComposerMention(text: string, cursor: number): ActiveComposerMention | null {
  const safeCursor = clampNumber(cursor, 0, text.length);
  const beforeCursor = text.slice(0, safeCursor);
  const match = beforeCursor.match(/(^|\s)([@/])([^\s@]*)$/);
  if (!match) return null;
  const start = beforeCursor.length - match[0].length + match[1].length;
  return {
    trigger: match[2] as "@" | "/",
    query: match[3] ?? "",
    start,
    end: safeCursor,
  };
}

function mentionMatches(item: ComposerMentionItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return item.value.toLowerCase().includes(normalizedQuery)
    || item.label.toLowerCase().includes(normalizedQuery)
    || item.meta.toLowerCase().includes(normalizedQuery);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

const MENTION_PREFIX_DEFINITIONS: Array<{ kind: "media" | "chapter" | "section" | "component"; meta: string }> = [
  { kind: "media", meta: "prefix · images" },
  { kind: "chapter", meta: "prefix · chapters" },
  { kind: "section", meta: "prefix · sections" },
  { kind: "component", meta: "prefix · components" },
];
