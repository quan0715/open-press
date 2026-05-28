export interface DocLink {
  label: string;
  href: string;
  description?: string;
}

export const docsSidebar: { heading: string; items: DocLink[] }[] = [
  {
    heading: "Start here",
    items: [
      { label: "Overview", href: "/docs" },
      { label: "Product boundary", href: "/docs/product-boundary" },
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
    heading: "API · Components",
    items: [
      { label: "Press", href: "/docs/api/press" },
      { label: "Frame", href: "/docs/api/frame" },
      { label: "MdxArea", href: "/docs/api/mdx-area" },
      { label: "Manuscript helpers", href: "/docs/api/manuscript" },
    ],
  },
  {
    heading: "API · Data",
    items: [
      { label: "MDX & sources", href: "/docs/api/sources" },
      { label: "Workspace config", href: "/docs/config" },
    ],
  },
  {
    heading: "Reference",
    items: [
      { label: "Surface index", href: "/docs/public-api" },
    ],
  },
];
