export type ShowcaseItem = {
  title: string;
  href: string;
  description: string;
  cover: string;
};

export const showcases: ShowcaseItem[] = [
  {
    title: "OpenPress User Story Book",
    href: "https://open-press-story.pages.dev",
    description:
      "A public user guide that introduces OpenPress through practical document workflows.",
    cover: "/showcase/openpress-user-story-book.png",
  },
  {
    title: "資料結構筆記",
    href: "https://data-structure-note.pages.dev/#page-01",
    description:
      "A Claude-like teaching notes document for data structures, published as a public OpenPress reader.",
    cover: "/showcase/data-structure-notes.png",
  },
  {
    title: "Academic Paper Skill Pack",
    href: "https://academic-paper-skill-pack-demo.pages.dev/#page-01",
    description:
      "A journal-style research paper starter with numbered sections, academic metadata, figures, tables, and references.",
    cover: "/showcase/academic-paper-skill-pack-demo.png",
  },
];
