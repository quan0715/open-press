export type ShowcaseItem = {
  slug: string;
  title: string;
  href: string;
  embedHref: string;
  description: string;
  audience: string;
  documentType: string;
  sourceMaterial: string;
  prompt: string;
  cover: string;
};

export const showcases: ShowcaseItem[] = [
  {
    slug: "user-story-book",
    title: "OpenPress User Story Book",
    href: "https://open-press-story.pages.dev",
    embedHref: "https://open-press-story.pages.dev",
    description:
      "A product guide built as an OpenPress document.",
    audience: "People evaluating OpenPress as an AI document workspace.",
    documentType: "Product guide / user story book",
    sourceMaterial: "Product positioning notes, workflow examples, starter skill docs, and framework behavior.",
    prompt:
      "Use OpenPress to turn these product notes into a user-facing guide. Keep claims grounded in existing features, organize it as chapters, and identify pages that need diagrams or examples.",
    cover: "/showcase/openpress-user-story-book.png",
  },
  {
    slug: "data-structure-notes",
    title: "資料結構筆記",
    href: "https://data-structure-note.pages.dev/#page-01",
    embedHref: "https://data-structure-note.pages.dev/#page-01",
    description:
      "Teaching notes published as a public reader.",
    audience: "Teachers, students, and tutorial authors maintaining course notes.",
    documentType: "Teaching notes / study guide",
    sourceMaterial: "Course outline, code examples, diagrams, exercises, and explanation drafts.",
    prompt:
      "Use OpenPress teaching-note conventions. Turn this outline into a chapter-by-chapter study guide, keep each section page-safe, add diagrams where they clarify concepts, and mark examples that need verification.",
    cover: "/showcase/data-structure-notes.png",
  },
  {
    slug: "academic-paper-pack",
    title: "Academic Paper Starter Skill",
    href: "https://academic-paper-skill-pack-demo.pages.dev/#page-01",
    embedHref: "https://academic-paper-skill-pack-demo.pages.dev/#page-01",
    description:
      "A journal-style paper starter.",
    audience: "Researchers and students drafting structured academic reports.",
    documentType: "Academic paper / research article",
    sourceMaterial: "Abstract, section outline, figures, tables, methods notes, and references.",
    prompt:
      "Use the academic-paper skill. Build a paper draft with numbered sections, metadata, figures, tables, and references. Do not invent citations; mark missing evidence explicitly.",
    cover: "/showcase/academic-paper-skill-pack-demo.png",
  },
];
