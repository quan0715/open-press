export interface DocLink {
  label: string;
  href: string;
  description?: string;
}

export const docsSidebar: { heading: string; items: DocLink[] }[] = [
  {
    heading: "Get started",
    items: [
      { label: "Overview", href: "/docs" },
      { label: "Quick start", href: "/docs/getting-started" },
      { label: "Product boundary", href: "/docs/product-boundary" },
    ],
  },
  {
    heading: "Features",
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
    heading: "Skills",
    items: [
      { label: "Overview", href: "/docs/skills" },
    ],
  },
  {
    heading: "Components",
    items: [
      { label: "Press", href: "/docs/api/press" },
      { label: "Workspace", href: "/docs/api/workspace" },
      { label: "Frame", href: "/docs/api/frame" },
      { label: "MdxArea", href: "/docs/api/mdx-area" },
      { label: "Manuscript helpers", href: "/docs/api/manuscript" },
    ],
  },
  {
    heading: "Hooks",
    items: [
      { label: "useSource", href: "/docs/api/use-source" },
    ],
  },
];
