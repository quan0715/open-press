export interface DocLink {
  label: string;
  href: string;
  description?: string;
}

export const docsSidebar: { heading: string; items: DocLink[] }[] = [
  {
    heading: "Start",
    items: [
      { label: "Overview", href: "/docs" },
      { label: "Quick start", href: "/docs/getting-started" },
      { label: "Work with Agent", href: "/docs/product-boundary" },
    ],
  },
  {
    heading: "Skills",
    items: [
      { label: "Overview", href: "/docs/skills" },
      { label: "create pages", href: "/docs/skills/create-pages" },
      { label: "create slide", href: "/docs/skills/create-slide" },
      { label: "/apply-comments", href: "/docs/skills/apply-comments" },
    ],
  },
  {
    heading: "Runtime",
    items: [
      { label: "Themes", href: "/docs/themes" },
      { label: "MDX sources", href: "/docs/api/sources" },
      { label: "Comment markers", href: "/docs/comments" },
      { label: "Workspace config", href: "/docs/config" },
    ],
  },
  {
    heading: "CLI",
    items: [
      { label: "Overview", href: "/docs/cli" },
      { label: "Lifecycle", href: "/docs/cli/lifecycle" },
      { label: "Output targets", href: "/docs/cli/output" },
      { label: "Tools", href: "/docs/cli/tools" },
    ],
  },
  {
    heading: "API reference",
    items: [
      { label: "Public API", href: "/docs/public-api" },
      { label: "Press", href: "/docs/api/press" },
      { label: "Workspace", href: "/docs/api/workspace" },
      { label: "Frame", href: "/docs/api/frame" },
      { label: "Text", href: "/docs/api/text" },
      { label: "MdxArea", href: "/docs/api/mdx-area" },
      { label: "Manuscript helpers", href: "/docs/api/manuscript" },
      { label: "useSource", href: "/docs/api/use-source" },
    ],
  },
];
