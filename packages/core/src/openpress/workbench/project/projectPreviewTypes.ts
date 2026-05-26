import type { ComposerMentionItem } from "../mentions";

export type ProjectMentionItem = ComposerMentionItem;

export type ProjectPanelPreview =
  | { kind: "media"; title: string; src: string }
  | { kind: "component"; title: string; html: string };

export function createProjectObjectEntityId(kind: "media" | "component", name: string) {
  return [kind, encodeURIComponent(name)].join(":");
}
