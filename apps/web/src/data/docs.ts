export interface DocLink {
  label: string;
  href: string;
  description?: string;
}

export const docsSidebar: { heading: string; items: DocLink[] }[] = [
  {
    heading: "Start here",
    items: [
      { label: "Overview", href: "/docs", description: "Why OpenPress exists and how the pieces fit." },
      {
        label: "Product boundary",
        href: "/docs/product-boundary",
        description: "What lives in OpenPress, and where to use something else.",
      },
    ],
  },
  {
    heading: "Contracts",
    items: [
      {
        label: "Public API",
        href: "/docs/public-api",
        description: "The surface that's stable for 1.0 — and the parts that aren't.",
      },
    ],
  },
];
