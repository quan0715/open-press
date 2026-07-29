import { useEffect, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { HtmlPageBlock, ReaderDocument } from "../../../src/openpress/document-model";
import { HtmlWorkbench } from "../../../src/openpress/workbench";
import type { WorkbenchPanel } from "../../../src/openpress/workbench/panels/WorkbenchControlPanel";

let root: Root | null = null;

export function mountWorkbenchToolsControlHarness() {
  mountHarness(<WorkbenchToolsControlHarness />);
}

export function mountSlideWorkbenchHarness() {
  const onOpenPresentation = (pageIndex: number) => {
    document.querySelector("#workbench-tools-control-harness-root")
      ?.setAttribute("data-openpress-presentation-index", String(pageIndex));
  };
  mountHarness(<SlideWorkbenchHarness onOpenPresentation={onOpenPresentation} />);
}

function mountHarness(content: ReactNode) {
  root?.unmount();
  document.querySelector("#workbench-tools-control-harness-root")?.remove();
  const container = document.createElement("div");
  container.id = "workbench-tools-control-harness-root";
  container.className = "fixed inset-0 z-[100] bg-[var(--op-workspace-bg)]";
  document.body.append(container);
  root = createRoot(container);
  root.render(content);
}

const page: HtmlPageBlock = {
  id: "tools-harness-page",
  kind: "htmlPage",
  title: "Tools harness page",
  pageNumber: 1,
  html: '<article style="padding:48px"><h1>Tools harness</h1><p>Canvas content</p></article>',
};

const documentFixture: ReaderDocument = {
  meta: { title: "Tools harness", type: "pages" },
  source: { type: "static-html", editable: false },
  blocks: [page],
};

const customPanel: WorkbenchPanel = {
  id: "custom",
  render: () => <section>Custom panel content</section>,
};

const slidePages: HtmlPageBlock[] = [1, 2].map((pageNumber) => ({
  id: `slide-harness-page-${pageNumber}`,
  kind: "htmlPage",
  title: `Slide ${pageNumber}`,
  pageNumber,
  frameKey: `slide-${pageNumber}`,
  html: `<article style="padding:48px"><h1>Slide ${pageNumber}</h1></article>`,
}));

const slideDocumentFixture: ReaderDocument = {
  meta: { title: "Slide harness", type: "slides" },
  source: {
    type: "static-html",
    editable: false,
    slides: slidePages.map((slide) => ({ id: slide.frameKey ?? slide.id })),
  },
  blocks: slidePages,
};

function WorkbenchToolsControlHarness() {
  const [panels, setPanels] = useState<WorkbenchPanel[]>([customPanel]);

  useEffect(() => {
    const controls = window as typeof window & {
      __openpressSetToolsHarnessPanels?: (visible: boolean) => void;
    };
    controls.__openpressSetToolsHarnessPanels = (visible) => setPanels(visible ? [customPanel] : []);
    return () => {
      delete controls.__openpressSetToolsHarnessPanels;
    };
  }, []);

  return (
    <HtmlWorkbench
      document={documentFixture}
      pages={[page]}
      style={{}}
      workspaceMode
      deploymentInfo={{ online: false, configured: false }}
      pressSlug="tools-harness"
      extraControlPanels={panels}
    />
  );
}

function SlideWorkbenchHarness({ onOpenPresentation }: { onOpenPresentation: (pageIndex: number) => void }) {
  return (
    <HtmlWorkbench
      document={slideDocumentFixture}
      pages={slidePages}
      style={{}}
      workspaceMode
      deploymentInfo={{ online: false, configured: false }}
      pressSlug="slide-harness"
      onOpenPresentation={onOpenPresentation}
    />
  );
}
