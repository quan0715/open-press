import { Text, type SlideMeta } from "@open-press/core";
import { DeckSlide } from "../../components/DeckSlide";

export const meta = {
  layout: "content",
  description: "Explains how the workspace uses the new slide metadata and build-local locators.",
  keypoints: [
    "Slides are thumbnails and pages",
    "Notes appear in the control panel",
    "Object locators are injected by the engine"
  ]
} satisfies SlideMeta;

export const notes = "Tie the architecture back to the UI: workspace features are powered by source structure, not hidden agent-authored ids.";

export default function WorkspaceInteractionSlide() {
  return (
    <DeckSlide id="workspace-interaction" variant="content">
        <section className="content-layout">
          <div className="content-heading">
            <Text as="p" className="kicker">04 · Workspace 的互動</Text>
            <Text as="h2">Workbench 讀的是 source contract，不是 agent 手寫的 hidden ids</Text>
          </div>
          <div className="content-grid">
            <article className="content-card">
              <Text as="span">Navigation</Text>
              <Text as="h3">縮圖與重排</Text>
              <Text as="p">左側縮圖來自 frame order；拖曳後透過 slide command 回寫 marker 順序。</Text>
            </article>
            <article className="content-card">
              <Text as="span">Notes</Text>
              <Text as="h3">講者備註</Text>
              <Text as="p">`export const notes` 進右側 notes panel，但永遠不 render 到投影片畫面。</Text>
            </article>
            <article className="content-card">
              <Text as="span">Locator</Text>
              <Text as="h3">Engine 注入</Text>
              <Text as="p">`data-op-id` 是 build-local locator；agent 不寫 `objectId`、不寫 proxy label。</Text>
            </article>
          </div>
        </section>
    </DeckSlide>
  );
}
