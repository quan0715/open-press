export type ShowcaseItem = {
  slug: string;
  title: string;
  href?: string;
  description: string;
  audience: string;
  documentType: string;
  sourceMaterial: string;
  prompt: string;
  cover: string;
  pages: string[];
  pageCount: number;
  proof: "real" | "demo";
};

const asset = (slug: string, file: string) => `/showcase/examples/${slug}/${file}`;

export const showcases: Record<"zh-tw" | "en" | "ja", ShowcaseItem[]> = {
  "zh-tw": [
    {
      slug: "user-story-book",
      title: "OpenPress 用戶故事書",
      href: "https://open-press-story.pages.dev/userstory/preview#page-01",
      description: "從真實框架文件與工作流程整理成 28 頁產品指南。",
      audience: "正在評估 OpenPress 的開發者與文件作者。",
      documentType: "產品指南",
      sourceMaterial: "產品定位、工作流程、CLI 與框架行為。",
      prompt: "使用 OpenPress 將這些產品資料整理成面向使用者的指南。所有功能描述都要能由現有框架驗證，按閱讀順序組織成章節，並以實際操作與範例補足抽象概念。",
      cover: asset("user-story-book", "cover.png"),
      pages: [asset("user-story-book", "cover.png"), asset("user-story-book", "page-12.png")],
      pageCount: 28,
      proof: "real",
    },
    {
      slug: "data-structure-notes",
      title: "資料結構課程筆記",
      href: "https://data-structure-note.pages.dev/#page-01",
      description: "把課綱、程式碼與練習整理成 158 頁公開學習指南。",
      audience: "維護課程內容的教師、學生與教學作者。",
      documentType: "教學筆記",
      sourceMaterial: "課程大綱、程式碼、圖解、例題與說明草稿。",
      prompt: "依照 OpenPress 教學筆記的編寫方式，把大綱轉換成逐章學習指南。保留可驗證的程式碼與推導，在需要釐清概念的地方加入圖解，並讓每個段落都適合頁面閱讀。",
      cover: asset("data-structure-notes", "cover.png"),
      pages: [asset("data-structure-notes", "cover.png"), asset("data-structure-notes", "page-08.png")],
      pageCount: 158,
      proof: "real",
    },
    {
      slug: "resume",
      title: "黃仁勳公開資料履歷",
      href: "https://open-press-resume.pages.dev/resume/preview#page-01",
      description: "將可查證的公開資料整理成一頁式主管履歷。",
      audience: "想把公開經歷整理成正式履歷的主管、研究者與文件作者。",
      documentType: "履歷",
      sourceMaterial: "NVIDIA 官方簡介、公開申報文件、大學資料與獎項紀錄。",
      prompt: "根據可查證的公開來源，整理一份黃仁勳的一頁式主管履歷。只採用來源能支持的職涯、學歷與獎項資訊，保留來源連結，並清楚標示這是非官方履歷。",
      cover: asset("resume", "cover.png"),
      pages: [asset("resume", "cover.png")],
      pageCount: 1,
      proof: "real",
    },
    {
      slug: "school-report",
      title: "虛構學校報告",
      href: "https://open-press-school-report.pages.dev/school-report/preview#page-01",
      description: "從研究問題、方法到觀察與反思的五頁完整報告。",
      audience: "想把課堂作業整理成正式文件的學生與教師。",
      documentType: "學校報告",
      sourceMaterial: "虛構問卷、觀察紀錄、研究問題與參考格式。",
      prompt: "以「養狗、信心與陪伴」為題完成一份學校報告。包含研究問題、方法、示範數據、圖表、討論、限制與反思；清楚說明所有受訪者、數值與引文都是虛構資料，不得把結果寫成真實研究結論。",
      cover: asset("school-report", "cover.png"),
      pages: [asset("school-report", "cover.png"), asset("school-report", "page-03.png")],
      pageCount: 5,
      proof: "demo",
    },
    {
      slug: "financial-report",
      title: "虛構年度財務報告",
      href: "https://open-press-financial-report.pages.dev/financial-report/preview#page-01",
      description: "含損益、資產負債與現金流的八頁年度報告。",
      audience: "需要財務敘事與報表版型的創業者、分析師與設計者。",
      documentType: "年度財務報告",
      sourceMaterial: "可重算的虛構財務資料、營運摘要與會計附註。",
      prompt: "使用這組可重算的虛構財務資料，製作 Northstar Goods 2025 年度報告。讓營運敘事與損益、財務狀況、現金流數字相互一致；清楚標示為示範資料與非投資建議，不得加入來源中不存在的業績或預測。",
      cover: asset("financial-report", "cover.png"),
      pages: [asset("financial-report", "cover.png"), asset("financial-report", "page-03.png"), asset("financial-report", "page-04.png")],
      pageCount: 8,
      proof: "demo",
    },
    {
      slug: "thesis",
      title: "經典學位論文模板",
      href: "https://open-press-thesis.pages.dev/thesis/preview#page-01",
      description: "以虛構城市熱研究填滿的十頁經典論文範例。",
      audience: "需要傳統論文結構與排版起點的研究生與學術作者。",
      documentType: "學位論文",
      sourceMaterial: "虛構研究問題、方法、96 筆示範觀察與參考文獻格式。",
      prompt: "以經典學位論文格式，將這組虛構的街道遮蔭與熱舒適資料整理成一份填寫完成的範例。包含摘要、目錄、文獻脈絡、方法、結果、討論、結論與參考文獻，並持續標示資料與學校皆為虛構。",
      cover: asset("thesis", "cover.png"),
      pages: [asset("thesis", "cover.png"), asset("thesis", "page-02.png"), asset("thesis", "page-06.png")],
      pageCount: 10,
      proof: "demo",
    },
  ],
  en: [
    {
      slug: "user-story-book", title: "OpenPress User Story Book", href: "https://open-press-story.pages.dev/userstory/preview#page-01",
      description: "A 28-page product guide built from real framework documentation and workflows.", audience: "Developers and document authors evaluating OpenPress.", documentType: "Product guide", sourceMaterial: "Product positioning, workflows, CLI usage, and framework behavior.",
      prompt: "Turn these OpenPress product materials into a user-facing guide. Ground every feature claim in the current framework, organize the content in reading order, and use real operations and examples to explain abstract concepts.",
      cover: asset("user-story-book", "cover.png"), pages: [asset("user-story-book", "cover.png"), asset("user-story-book", "page-12.png")], pageCount: 28, proof: "real",
    },
    {
      slug: "data-structure-notes", title: "Data Structures Course Notes", href: "https://data-structure-note.pages.dev/#page-01",
      description: "A 158-page public study guide built from a syllabus, code, and exercises.", audience: "Teachers, students, and tutorial authors maintaining course material.", documentType: "Teaching notes", sourceMaterial: "Course outline, code, diagrams, exercises, and explanation drafts.",
      prompt: "Turn the outline into chapter-by-chapter OpenPress course notes. Preserve verifiable code and derivations, add diagrams where they clarify a concept, and keep every section comfortable to read on a fixed page.",
      cover: asset("data-structure-notes", "cover.png"), pages: [asset("data-structure-notes", "cover.png"), asset("data-structure-notes", "page-08.png")], pageCount: 158, proof: "real",
    },
    {
      slug: "resume", title: "Jensen Huang Public-Source Resume", href: "https://open-press-resume.pages.dev/resume/preview#page-01", description: "A one-page executive resume assembled from verifiable public sources.", audience: "Executives, researchers, and document authors turning public career records into a formal resume.", documentType: "Resume", sourceMaterial: "NVIDIA biographies, public filings, university records, and award citations.",
      prompt: "Create a one-page executive resume for Jensen Huang from verifiable public sources. Include only career, education, and recognition details supported by those sources, preserve the source links, and label the result as an unofficial resume.",
      cover: asset("resume", "cover.png"), pages: [asset("resume", "cover.png")], pageCount: 1, proof: "real",
    },
    {
      slug: "school-report", title: "Fictional School Report", href: "https://open-press-school-report.pages.dev/school-report/preview#page-01", description: "A five-page report covering the question, method, observations, and reflection.", audience: "Students and teachers turning classwork into a formal document.", documentType: "School report", sourceMaterial: "Fictional survey data, observation notes, a research question, and reference formatting.",
      prompt: "Complete a school report on dog ownership, confidence, and companionship. Include the question, method, sample data, charts, discussion, limitations, and reflection. State clearly that every participant, value, and quotation is fictional.",
      cover: asset("school-report", "cover.png"), pages: [asset("school-report", "cover.png"), asset("school-report", "page-03.png")], pageCount: 5, proof: "demo",
    },
    {
      slug: "financial-report", title: "Fictional Annual Financial Report", href: "https://open-press-financial-report.pages.dev/financial-report/preview#page-01", description: "An eight-page annual report with operations, position, and cash-flow statements.", audience: "Founders, analysts, and designers who need a financial narrative and statement layout.", documentType: "Annual financial report", sourceMaterial: "Recalculable fictional financial data, an operating summary, and accounting notes.",
      prompt: "Use this recalculable fictional dataset to create the Northstar Goods 2025 annual report. Reconcile the narrative with the operations, financial position, and cash-flow statements. Label it as demo data and not financial advice; invent no performance or forecasts.",
      cover: asset("financial-report", "cover.png"), pages: [asset("financial-report", "cover.png"), asset("financial-report", "page-03.png"), asset("financial-report", "page-04.png")], pageCount: 8, proof: "demo",
    },
    {
      slug: "thesis", title: "Classic Degree Thesis Template", href: "https://open-press-thesis.pages.dev/thesis/preview#page-01", description: "A ten-page classic thesis example filled with a fictional urban-heat study.", audience: "Graduate students and academic authors who need a traditional thesis starting point.", documentType: "Degree thesis", sourceMaterial: "A fictional question, method, 96 sample observations, and reference formatting.",
      prompt: "Use a classic degree-thesis structure to turn the fictional street-shade and thermal-comfort dataset into a completed example. Include the abstract, contents, literature context, method, results, discussion, conclusion, and references, and mark the university and data as fictional throughout.",
      cover: asset("thesis", "cover.png"), pages: [asset("thesis", "cover.png"), asset("thesis", "page-02.png"), asset("thesis", "page-06.png")], pageCount: 10, proof: "demo",
    },
  ],
  ja: [
    {
      slug: "user-story-book", title: "OpenPress ユーザーストーリーブック", href: "https://open-press-story.pages.dev/userstory/preview#page-01",
      description: "実際のフレームワーク文書とワークフローから作成した28ページの製品ガイド。", audience: "OpenPressを評価する開発者とドキュメント作成者。", documentType: "製品ガイド", sourceMaterial: "製品ポジショニング、ワークフロー、CLI、フレームワークの動作。",
      prompt: "OpenPressの製品資料をユーザー向けガイドにしてください。機能の説明は現在のフレームワークで確認できる内容に限定し、読書順に章を構成して、実際の操作と例で抽象的な概念を説明してください。",
      cover: asset("user-story-book", "cover.png"), pages: [asset("user-story-book", "cover.png"), asset("user-story-book", "page-12.png")], pageCount: 28, proof: "real",
    },
    {
      slug: "data-structure-notes", title: "データ構造の講義ノート", href: "https://data-structure-note.pages.dev/#page-01",
      description: "シラバス、コード、演習から作成した158ページの公開学習ガイド。", audience: "講義内容を管理する教師、学生、チュートリアル作成者。", documentType: "講義ノート", sourceMaterial: "講義概要、コード、図、演習、解説草稿。",
      prompt: "概要を章ごとのOpenPress講義ノートにしてください。検証できるコードと導出を残し、概念の理解に役立つ図を加え、各節を固定ページで読みやすく整理してください。",
      cover: asset("data-structure-notes", "cover.png"), pages: [asset("data-structure-notes", "cover.png"), asset("data-structure-notes", "page-08.png")], pageCount: 158, proof: "real",
    },
    {
      slug: "resume", title: "ジェンスン・フアン公開情報履歴書", href: "https://open-press-resume.pages.dev/resume/preview#page-01", description: "検証可能な公開情報を1ページに整理したエグゼクティブ履歴書。", audience: "公開された経歴を正式な履歴書にまとめたい経営者、研究者、ドキュメント作成者。", documentType: "履歴書", sourceMaterial: "NVIDIAの公式略歴、公開資料、大学資料、受賞記録。",
      prompt: "検証可能な公開情報に基づき、ジェンスン・フアンの1ページのエグゼクティブ履歴書を作成してください。出典で確認できる職歴、学歴、受賞歴だけを使用し、出典リンクを残して、非公式の履歴書であることを明記してください。",
      cover: asset("resume", "cover.png"), pages: [asset("resume", "cover.png")], pageCount: 1, proof: "real",
    },
    {
      slug: "school-report", title: "架空の学校レポート", href: "https://open-press-school-report.pages.dev/school-report/preview#page-01", description: "問い、方法、観察、考察を収めた5ページの完成レポート。", audience: "授業課題を正式な文書にしたい学生と教師。", documentType: "学校レポート", sourceMaterial: "架空のアンケート、観察記録、研究課題、参考文献形式。",
      prompt: "犬との暮らし、自信、仲間意識をテーマに学校レポートを完成させてください。研究課題、方法、サンプルデータ、図表、考察、限界、振り返りを含め、人物、数値、引用がすべて架空であることを明示してください。",
      cover: asset("school-report", "cover.png"), pages: [asset("school-report", "cover.png"), asset("school-report", "page-03.png")], pageCount: 5, proof: "demo",
    },
    {
      slug: "financial-report", title: "架空の年次財務報告書", href: "https://open-press-financial-report.pages.dev/financial-report/preview#page-01", description: "損益、財政状態、キャッシュフローを含む8ページの年次報告書。", audience: "財務ストーリーと計算書レイアウトが必要な創業者、分析者、デザイナー。", documentType: "年次財務報告書", sourceMaterial: "再計算できる架空の財務データ、事業概要、会計注記。",
      prompt: "再計算可能な架空データを使い、Northstar Goodsの2025年次報告書を作成してください。事業説明と損益、財政状態、キャッシュフローを一致させ、デモデータかつ投資助言ではないと明示し、存在しない実績や予測を加えないでください。",
      cover: asset("financial-report", "cover.png"), pages: [asset("financial-report", "cover.png"), asset("financial-report", "page-03.png"), asset("financial-report", "page-04.png")], pageCount: 8, proof: "demo",
    },
    {
      slug: "thesis", title: "クラシック学位論文テンプレート", href: "https://open-press-thesis.pages.dev/thesis/preview#page-01", description: "架空の都市熱研究を収めた10ページのクラシック論文例。", audience: "伝統的な論文構成と組版の起点が必要な大学院生と研究者。", documentType: "学位論文", sourceMaterial: "架空の問い、方法、96件のサンプル観察、参考文献形式。",
      prompt: "クラシックな学位論文の形式で、架空の街路日陰と熱快適性データを完成例にしてください。要旨、目次、文献背景、方法、結果、考察、結論、参考文献を含め、大学とデータが架空であることを全編で明示してください。",
      cover: asset("thesis", "cover.png"), pages: [asset("thesis", "cover.png"), asset("thesis", "page-02.png"), asset("thesis", "page-06.png")], pageCount: 10, proof: "demo",
    },
  ],
};

export function getShowcases(lang: string): ShowcaseItem[] {
  return showcases[lang as keyof typeof showcases] ?? showcases["zh-tw"];
}
