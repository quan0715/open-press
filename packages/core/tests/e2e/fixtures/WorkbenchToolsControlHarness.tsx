import { createRoot, type Root } from "react-dom/client";
import { WorkbenchToolsControl } from "../../../src/openpress/workbench/panels/WorkbenchToolsControl";

let root: Root | null = null;

export function mountWorkbenchToolsControlHarness() {
  root?.unmount();
  document.querySelector("#workbench-tools-control-harness-root")?.remove();
  const container = document.createElement("div");
  container.id = "workbench-tools-control-harness-root";
  document.body.append(container);
  root = createRoot(container);
  root.render(<WorkbenchToolsControlHarness />);
}

function WorkbenchToolsControlHarness() {
  return (
    <div className="fixed inset-0 z-[2000] bg-[var(--op-workspace-bg)]" data-tools-harness-canvas>
      <div className="absolute right-4 top-2">
        <WorkbenchToolsControl
          panels={[{
            id: "custom",
            render: () => <section>Custom panel content</section>,
          }]}
        />
      </div>
    </div>
  );
}
