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

export const showcases: Record<string, ShowcaseItem[]> = {
  "zh-tw": [
    {
      slug: "user-story-book",
      title: "OpenPress 用戶故事書",
      href: "https://open-press-story.pages.dev",
      embedHref: "https://open-press-story.pages.dev",
      description: "這是一本使用 OpenPress 構建的產品指南。",
      audience: "正在評估 OpenPress 系統的開發者與一般用戶。",
      documentType: "產品指南 / 用戶故事書",
      sourceMaterial: "產品定位筆記、工作流程範例、啟動文件與框架行為。",
      prompt: "使用 OpenPress 將這些產品筆記轉化為面向用戶的指南。確保聲明立足於現有功能，將其組織成章節，並標示需要圖表或範例的頁面。",
      cover: "/showcase/openpress-user-story-book.png",
    },
    {
      slug: "data-structure-notes",
      title: "資料結構筆記",
      href: "https://data-structure-note.pages.dev/#page-01",
      embedHref: "https://data-structure-note.pages.dev/#page-01",
      description: "發布為公開網頁閱讀器的教學筆記。",
      audience: "維護課程筆記的教師、學生與教學作者。",
      documentType: "教學筆記 / 學習指南",
      sourceMaterial: "課程大綱、程式碼範例、圖表、練習題與草稿。",
      prompt: "使用 OpenPress 教學筆記慣例。將這份大綱轉換為逐章的學習指南，保持各個區段適合頁面閱讀，在有助於釐清概念的地方加上圖表，並標記需要驗證的範例。",
      cover: "/showcase/data-structure-notes.png",
    },
  ],
  en: [
    {
      slug: "user-story-book",
      title: "OpenPress User Story Book",
      href: "https://open-press-story.pages.dev",
      embedHref: "https://open-press-story.pages.dev",
      description: "A product guide built as an OpenPress document.",
      audience: "People evaluating OpenPress as an AI document workspace.",
      documentType: "Product guide / user story book",
      sourceMaterial: "Product positioning notes, workflow examples, starter skill docs, and framework behavior.",
      prompt: "Use OpenPress to turn these product notes into a user-facing guide. Keep claims grounded in existing features, organize it as chapters, and identify pages that need diagrams or examples.",
      cover: "/showcase/openpress-user-story-book.png",
    },
    {
      slug: "data-structure-notes",
      title: "Data Structure Notes",
      href: "https://data-structure-note.pages.dev/#page-01",
      embedHref: "https://data-structure-note.pages.dev/#page-01",
      description: "Teaching notes published as a public reader.",
      audience: "Teachers, students, and tutorial authors maintaining course notes.",
      documentType: "Teaching notes / study guide",
      sourceMaterial: "Course outline, code examples, diagrams, exercises, and explanation drafts.",
      prompt: "Use OpenPress teaching-note conventions. Turn this outline into a chapter-by-chapter study guide, keep each section page-safe, add diagrams where they clarify concepts, and mark examples that need verification.",
      cover: "/showcase/data-structure-notes.png",
    },
  ],
  ja: [
    {
      slug: "user-story-book",
      title: "OpenPress ユーザーストーリーブック",
      href: "https://open-press-story.pages.dev",
      embedHref: "https://open-press-story.pages.dev",
      description: "OpenPress で構築された製品ガイド。",
      audience: "AIドキュメントワークスペースとしてOpenPressを評価している人々。",
      documentType: "製品ガイド / ユーザーストーリーブック",
      sourceMaterial: "製品のポジショニングノート、ワークフローの例、スタータースキル、フレームワークの動作。",
      prompt: "OpenPressを使用して、これらの製品ノートをユーザー向けのガイドに変えてください。既存の機能に基づいた説明を保ち、章として構成し、図や例が必要なページを特定してください。",
      cover: "/showcase/openpress-user-story-book.png",
    },
    {
      slug: "data-structure-notes",
      title: "データ構造ノート",
      href: "https://data-structure-note.pages.dev/#page-01",
      embedHref: "https://data-structure-note.pages.dev/#page-01",
      description: "パブリックリーダーとして公開された講義ノート。",
      audience: "コースノートを維持管理する教師、学生、チュートリアル作成者。",
      documentType: "講義ノート / 学習ガイド",
      sourceMaterial: "コースの概要、コード例、図、練習問題、および解説の草稿。",
      prompt: "OpenPressの講義ノートの規約に従ってください。この概要を章ごとの学習ガイドに変換し、各セクションをページに収まるようにし、概念を明確にする図を追加し、検証が必要な例にマークを付けてください。",
      cover: "/showcase/data-structure-notes.png",
    },
  ],
};
