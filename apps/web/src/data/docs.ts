export interface DocLink {
  label: string;
  href: string;
  description?: string;
}

export interface SidebarSection {
  heading: string;
  items: DocLink[];
}

export const docsSidebar: Record<string, SidebarSection[]> = {
  en: [
    {
      heading: "Getting Started",
      items: [
        { label: "Quick start", href: "/docs/getting-started" },
      ],
    },
    {
      heading: "Core Concepts",
      items: [
        { label: "Agent-First Philosophy", href: "/docs/concepts/agent-first-philosophy" },
        { label: "Working with Agents", href: "/docs/concepts/working-with-agents" },
        { label: "CLI Lifecycle", href: "/docs/concepts/cli-lifecycle" },
        { label: "Component Architecture", href: "/docs/concepts/components-architecture" },
        { label: "Workspace Config", href: "/docs/concepts/workspace-config" },
        { label: "Themes & Styling", href: "/docs/concepts/themes" },
        { label: "Slide Architecture", href: "/docs/concepts/slides" },
      ],
    },
    {
      heading: "Guides & Workflow",
      items: [
        { label: "Using Skills", href: "/docs/guides/using-skills" },
        { label: "Create Pages", href: "/docs/guides/create-pages" },
        { label: "Create Presentations", href: "/docs/guides/create-slides" },
        { label: "Review & Apply Comments", href: "/docs/guides/apply-comments" },
        { label: "Working with Comment Markers", href: "/docs/guides/comment-markers" },
      ],
    },
    {
      heading: "Reference",
      items: [
        { label: "CLI Overview", href: "/docs/reference/cli-overview" },
        { label: "CLI Tools", href: "/docs/reference/cli-tools" },
        { label: "Output Targets", href: "/docs/reference/cli-outputs" },
        { label: "Public API", href: "/docs/reference/public-api" },
        { label: "<Press>", href: "/docs/reference/components-press" },
        { label: "<Workspace>", href: "/docs/reference/components-workspace" },
        { label: "<Frame>", href: "/docs/reference/components-frame" },
        { label: "<Text>", href: "/docs/reference/components-text" },
        { label: "<MdxArea>", href: "/docs/reference/components-mdx-area" },
        { label: "MDX Sources", href: "/docs/reference/data-mdx-sources" },
        { label: "useSource", href: "/docs/reference/data-use-source" },
        { label: "Manuscript Helpers", href: "/docs/reference/data-manuscript" },
      ],
    },
  ],
  "zh-tw": [
    {
      heading: "入門教學",
      items: [
        { label: "快速開始", href: "/docs/getting-started" },
      ],
    },
    {
      heading: "核心概念",
      items: [
        { label: "Agent-First 哲學", href: "/docs/concepts/agent-first-philosophy" },
        { label: "與 Agent 協作", href: "/docs/concepts/working-with-agents" },
        { label: "CLI 生命週期", href: "/docs/concepts/cli-lifecycle" },
        { label: "元件架構", href: "/docs/concepts/components-architecture" },
        { label: "工作區設定", href: "/docs/concepts/workspace-config" },
        { label: "佈景主題與樣式", href: "/docs/concepts/themes" },
        { label: "簡報架構", href: "/docs/concepts/slides" },
      ],
    },
    {
      heading: "操作指南與工作流",
      items: [
        { label: "使用 Skills", href: "/docs/guides/using-skills" },
        { label: "建立文件頁面", href: "/docs/guides/create-pages" },
        { label: "建立簡報", href: "/docs/guides/create-slides" },
        { label: "審閱與套用評論", href: "/docs/guides/apply-comments" },
        { label: "使用評論標記", href: "/docs/guides/comment-markers" },
      ],
    },
    {
      heading: "參考資料",
      items: [
        { label: "CLI 概覽", href: "/docs/reference/cli-overview" },
        { label: "CLI 工具", href: "/docs/reference/cli-tools" },
        { label: "輸出目標", href: "/docs/reference/cli-outputs" },
        { label: "公開 API", href: "/docs/reference/public-api" },
        { label: "<Press>", href: "/docs/reference/components-press" },
        { label: "<Workspace>", href: "/docs/reference/components-workspace" },
        { label: "<Frame>", href: "/docs/reference/components-frame" },
        { label: "<Text>", href: "/docs/reference/components-text" },
        { label: "<MdxArea>", href: "/docs/reference/components-mdx-area" },
        { label: "MDX 來源", href: "/docs/reference/data-mdx-sources" },
        { label: "useSource", href: "/docs/reference/data-use-source" },
        { label: "手稿輔助工具", href: "/docs/reference/data-manuscript" },
      ],
    },
  ],
  ja: [
    {
      heading: "はじめに",
      items: [
        { label: "クイックスタート", href: "/docs/getting-started" },
      ],
    },
    {
      heading: "コアコンセプト",
      items: [
        { label: "Agent-First哲学", href: "/docs/concepts/agent-first-philosophy" },
        { label: "Agentとの連携", href: "/docs/concepts/working-with-agents" },
        { label: "CLI ライフサイクル", href: "/docs/concepts/cli-lifecycle" },
        { label: "コンポーネントアーキテクチャ", href: "/docs/concepts/components-architecture" },
        { label: "ワークスペース設定", href: "/docs/concepts/workspace-config" },
        { label: "テーマとスタイル", href: "/docs/concepts/themes" },
        { label: "スライドアーキテクチャ", href: "/docs/concepts/slides" },
      ],
    },
    {
      heading: "ガイドとワークフロー",
      items: [
        { label: "スキルの使用", href: "/docs/guides/using-skills" },
        { label: "ページ作成", href: "/docs/guides/create-pages" },
        { label: "スライド作成", href: "/docs/guides/create-slides" },
        { label: "コメントのレビューと適用", href: "/docs/guides/apply-comments" },
        { label: "コメントマーカーの使用", href: "/docs/guides/comment-markers" },
      ],
    },
    {
      heading: "リファレンス",
      items: [
        { label: "CLI 概要", href: "/docs/reference/cli-overview" },
        { label: "CLI ツール", href: "/docs/reference/cli-tools" },
        { label: "出力ターゲット", href: "/docs/reference/cli-outputs" },
        { label: "パブリック API", href: "/docs/reference/public-api" },
        { label: "<Press>", href: "/docs/reference/components-press" },
        { label: "<Workspace>", href: "/docs/reference/components-workspace" },
        { label: "<Frame>", href: "/docs/reference/components-frame" },
        { label: "<Text>", href: "/docs/reference/components-text" },
        { label: "<MdxArea>", href: "/docs/reference/components-mdx-area" },
        { label: "MDX ソース", href: "/docs/reference/data-mdx-sources" },
        { label: "useSource", href: "/docs/reference/data-use-source" },
        { label: "原稿ヘルパー", href: "/docs/reference/data-manuscript" },
      ],
    },
  ],
};
