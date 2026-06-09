export const homeVersion = "1.0";

export const homeSeo = {
  "zh-tw": {
    title: "OpenPress — 為 AI 智能體打造的開源出版工作區",
    description:
      "OpenPress 是一個以智能體為首的出版工作區，支援可編輯原始碼、固定版面、MDX 文件、即時預覽、驗證、PDF 與圖片輸出。",
    image: "/openpress-og.svg",
    keywords: [
      "OpenPress",
      "AI 出版",
      "智能體工作區",
      "固定版面 PDF",
      "網頁閱讀器",
      "MDX 文件",
    ],
  },
  en: {
    title: "OpenPress — open-source publishing workspace for AI agents",
    description:
      "OpenPress is an agent-first document package and publishing workspace for editable sources, fixed pages, MDX documents, preview, validation, PDF, and image export.",
    image: "/openpress-og.svg",
    keywords: [
      "OpenPress",
      "agent-first document package",
      "AI publishing workspace",
      "fixed-layout PDF",
      "web reader",
      "MDX documents",
    ],
  },
  ja: {
    title: "OpenPress — AIエージェントのためのオープンソース出版ワークスペース",
    description:
      "OpenPressは、AIエージェント向けに設計されたドキュメントパッケージおよび出版ワークスペースです。MDX、プレビュー、PDFエクスポートをサポートします。",
    image: "/openpress-og.svg",
    keywords: [
      "OpenPress",
      "AI出版",
      "エージェントワークスペース",
      "PDFエクスポート",
      "MDX",
    ],
  },
};

export const navLinks = {
  "zh-tw": [
    { label: "展示", href: "/showcase" },
    { label: "文件", href: "/docs" },
    { label: "Star", href: "https://github.com/quan0715/open-press" },
    { label: "npm", href: "https://www.npmjs.com/package/@open-press/cli" },
  ],
  en: [
    { label: "Demo", href: "/showcase" },
    { label: "Docs", href: "/docs" },
    { label: "Star", href: "https://github.com/quan0715/open-press" },
    { label: "npm", href: "https://www.npmjs.com/package/@open-press/cli" },
  ],
  ja: [
    { label: "デモ", href: "/showcase" },
    { label: "ドキュメント", href: "/docs" },
    { label: "Star", href: "https://github.com/quan0715/open-press" },
    { label: "npm", href: "https://www.npmjs.com/package/@open-press/cli" },
  ],
};

export const homeStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OpenPress",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "OpenPress is an agent-first document package and publishing workspace for editable sources, fixed pages, MDX documents, preview, validation, PDF, and image export.",
  url: "https://open-press.dev",
  codeRepository: "https://github.com/quan0715/open-press",
};
