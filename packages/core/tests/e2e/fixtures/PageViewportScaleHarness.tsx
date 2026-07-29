import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePageViewportScale } from "../../../src/openpress/reader/usePageViewportScale";

const ALPHA_STORAGE_KEY = "openpress:test:page-scale:alpha";
const BETA_STORAGE_KEY = "openpress:test:page-scale:beta";

let root: Root | null = null;

export function mountPageViewportScaleHarness() {
  root?.unmount();
  document.querySelector("#page-viewport-scale-harness-root")?.remove();
  const container = document.createElement("div");
  container.id = "page-viewport-scale-harness-root";
  document.body.append(container);
  root = createRoot(container);
  root.render(<PageViewportScaleHarness />);
}

function PageViewportScaleHarness() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const [storageKey, setStorageKey] = useState(ALPHA_STORAGE_KEY);
  const viewport = usePageViewportScale({
    stageRef,
    pageContainerRef,
    pageCount: 1,
    scaleModeStorageKey: storageKey,
  });

  useEffect(() => {
    const controls = window as typeof window & { __openpressSwitchScaleStorageKey?: () => void };
    controls.__openpressSwitchScaleStorageKey = () => setStorageKey(BETA_STORAGE_KEY);
    return () => {
      delete controls.__openpressSwitchScaleStorageKey;
    };
  }, []);

  return (
    <div
      ref={stageRef}
      data-page-viewport-scale-harness
      data-scale-mode={viewport.scaleMode}
      style={{ height: 500, width: 500 }}
    >
      <div ref={pageContainerRef}>
        <div className="openpress-html-page__html" style={{ height: 400, width: 300 }} />
      </div>
    </div>
  );
}
