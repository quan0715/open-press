import { showcases } from "./showcases";

export const homeVersion = "0.7";

export const homeSeo = {
  title: "OpenPress — AI-written documents, ready to publish",
  description:
    "OpenPress turns AI-written content, rough notes, and source material into structured reports, polished PDFs, and shareable web documents.",
  image: "/openpress-og.svg",
  keywords: [
    "OpenPress",
    "AI document workspace",
    "fixed-layout PDF",
    "web reader",
    "formal documents",
    "AI writing workflow",
    "MDX documents",
    "MDX to PDF",
    "AI reports",
  ],
};

export const navLinks = [
  { label: "Use cases", href: "/#use-cases" },
  { label: "AutoPaging", href: "/#autopaging" },
  { label: "Workflow", href: "/#workflow" },
  { label: "Agents", href: "/#agents" },
  { label: "Showcase", href: "/#showcase" },
  { label: "Docs", href: "/docs" },
  { label: "GitHub", href: "https://github.com/quan0715/open-press" },
  { label: "npm", href: "https://www.npmjs.com/package/@open-press/cli" },
];

export const useCases = [
  {
    audience: "Students and researchers",
    documents: "Submit a polished report",
    source: "Course requirements, reading notes, references, and early outlines",
    outcome: "Turn scattered notes into a report with structure, visuals, and a clean PDF.",
    prompt:
      "Turn these notes into a formal report. Keep weak claims marked.",
  },
  {
    audience: "Consultants and analysts",
    documents: "Deliver client-ready research",
    source: "Interviews, market notes, charts, screenshots, and working findings",
    outcome: "Shape findings into a concise narrative your client can review.",
    prompt:
      "Draft a report from this research. Separate evidence from recommendations.",
  },
  {
    audience: "Product and engineering teams",
    documents: "Keep product docs consistent",
    source: "Product rules, decisions, diagrams, screenshots, and release context",
    outcome: "Turn decisions, screenshots, and rules into maintainable specs.",
    prompt:
      "Turn these product notes into a spec. Preserve decisions and open questions.",
  },
  {
    audience: "Teachers and content teams",
    documents: "Publish learning materials",
    source: "Lesson outlines, examples, exercises, diagrams, and style requirements",
    outcome: "Create handouts, guides, and course notes from one repeatable workflow.",
    prompt:
      "Turn this outline into a teachable document for web and print.",
  },
  {
    audience: "Policy and humanities teams",
    documents: "Organize evidence-heavy writing",
    source: "Interview excerpts, reading memos, field notes, policy context, and tables",
    outcome: "Keep quotes, notes, and interpretation inside a clear narrative.",
    prompt:
      "Organize these notes into a brief. Separate evidence from interpretation.",
  },
];

export const promptSteps = [
  {
    label: "Bring the material",
    text:
      "I have notes, sources, and a rough outline. Help me find the structure.",
  },
  {
    label: "Shape the document",
    text:
      "Draft the sections. Mark weak claims and suggest useful visuals.",
  },
  {
    label: "Review for delivery",
    text:
      "Check the reader and PDF before publishing.",
  },
];

export const capabilities = [
  ["Agent-readable workspace", "Source and output stay separated."],
  ["Fixed-layout pages", "PDF layout is part of the system."],
  ["One source, two outputs", "Ship a web reader and a PDF."],
  ["Validation gates", "Render and check before publishing."],
];

export const agentPartners = [
  "Claude Code",
  "Codex",
  "Google Antigravity",
  "Cursor",
  "Gemini CLI",
  "Cline",
  "Continue",
  "GitHub Copilot",
];

export const autoPagingSteps = [
  {
    label: "Narrative source",
    title: "Split into chapters",
    body: "Keep each part editable.",
  },
  {
    label: "Measure",
    title: "Render real HTML",
    body: "Measure real content.",
  },
  {
    label: "Allocate",
    title: "Fit fixed pages",
    body: "Place blocks into pages.",
  },
  {
    label: "Review",
    title: "Revise precisely",
    body: "Target a chapter or page.",
  },
];

export const packageItems = [
  {
    name: "@open-press/cli",
    role: "Workspace launcher",
    message: "Init, render, export, deploy.",
    href: "https://www.npmjs.com/package/@open-press/cli",
  },
  {
    name: "@open-press/core",
    role: "Document engine",
    message: "Press Tree and page rendering.",
    href: "https://www.npmjs.com/package/@open-press/core",
  },
  {
    name: "OpenPress skills",
    role: "Agent contract",
    message: "Rules for agent edits.",
    href: "https://github.com/quan0715/open-press/tree/main/skills",
  },
  {
    name: "Style packs",
    role: "Document identity",
    message: "Reusable document looks.",
    href: "https://open-press.dev/showcase",
  },
];

export const featuredShowcases = showcases.slice(0, 3);

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
