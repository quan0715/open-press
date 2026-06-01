export const homeVersion = "1.0";

export const homeSeo = {
  title: "OpenPress — open-source publishing workspace for AI agents",
  description:
    "OpenPress is an agent-first document package and publishing workspace for editable sources, fixed pages, MDX documents, preview, validation, PDF, and image export.",
  image: "/openpress-og.svg",
  keywords: [
    "OpenPress",
    "agent-first document package",
    "AI publishing workspace",
    "AI document workspace",
    "agent-made publishing",
    "fixed-layout PDF",
    "AI agent skills",
    "web reader",
    "formal documents",
    "MDX documents",
    "MDX to PDF",
  ],
};

export const navLinks = [
  { label: "Showcase", href: "/showcase" },
  { label: "Docs", href: "/docs" },
  { label: "Star", href: "https://github.com/quan0715/open-press" },
  { label: "npm", href: "https://www.npmjs.com/package/@open-press/cli" },
];

export const homeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OpenPress",
    url: "https://open-press.dev",
    description: homeSeo.description,
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OpenPress",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Windows, Linux",
    description: homeSeo.description,
    url: "https://open-press.dev",
    codeRepository: "https://github.com/quan0715/open-press",
    license: "https://github.com/quan0715/open-press/blob/main/LICENSE",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    sameAs: [
      "https://github.com/quan0715/open-press",
      "https://www.npmjs.com/package/@open-press/cli",
      "https://www.npmjs.com/package/@open-press/core",
    ],
  },
];
