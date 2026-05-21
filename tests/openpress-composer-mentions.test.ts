import { describe, expect, it } from "vitest";
import { createMentionSuggestions, type ActiveComposerMention, type ComposerMentionItem } from "../src/openpress/composerMentions";

const mentionItems: ComposerMentionItem[] = [
  { trigger: "@", value: "@media/stack.png", label: "stack.png", meta: "media", kind: "media" },
  { trigger: "@", value: "@chapter/1-Linked-List", label: "1 Linked List", meta: "chapter", kind: "chapter" },
  { trigger: "@", value: "@section/1.1-List-Node-與-Pointer", label: "1.1 List、Node 與 Pointer", meta: "section", kind: "section" },
  { trigger: "@", value: "@component/linked-list-diagram", label: "linked-list-diagram", meta: "component", kind: "component" },
  { trigger: "/", value: "/rewrite-section", label: "rewrite-section", meta: "skill", kind: "skill" },
];

function activeMention(query: string, trigger: "@" | "/" = "@"): ActiveComposerMention {
  return { trigger, query, start: 0, end: query.length + 1 };
}

describe("composer mention suggestions", () => {
  it("shows available @ prefixes before raw assets", () => {
    const suggestions = createMentionSuggestions(activeMention(""), mentionItems, 8);

    expect(suggestions.map((item) => item.value)).toEqual([
      "@media/",
      "@chapter/",
      "@section/",
      "@component/",
    ]);
  });

  it("filters by selected prefix", () => {
    const suggestions = createMentionSuggestions(activeMention("section/"), mentionItems, 8);

    expect(suggestions.map((item) => item.value)).toEqual([
      "@section/1.1-List-Node-與-Pointer",
    ]);
  });

  it("keeps direct section lookup available", () => {
    const suggestions = createMentionSuggestions(activeMention("1.1"), mentionItems, 8);

    expect(suggestions.some((item) => item.value === "@section/1.1-List-Node-與-Pointer")).toBe(true);
  });

  it("keeps slash skill suggestions separate", () => {
    const suggestions = createMentionSuggestions(activeMention("rewrite", "/"), mentionItems, 8);

    expect(suggestions.map((item) => item.value)).toEqual(["/rewrite-section"]);
  });
});
