import { Text, type SlideMeta } from "@open-press/core";
import { DeckSlide } from "../../components/DeckSlide";

export const meta = {
  layout: "content",
  description: "Explains the folder-per-slide contract and where each authoring concern lives.",
  keypoints: [
    "press.tsx is an ordered index",
    "slides/&lt;id&gt;/slide.tsx owns content",
    "meta and notes stay beside the slide"
  ]
} satisfies SlideMeta;

export const notes = "Emphasize that press.tsx is intentionally boring. That is the point: it becomes stable and easy to reorder.";

export default function FolderArchitectureSlide() {
  return (
    <DeckSlide id="folder-architecture" variant="content">
        <section className="content-layout">
          <div className="content-heading">
            <Text as="p" className="kicker">01 · Slide Press 資料夾架構</Text>
            <Text as="h2">把 deck 拆成可維護的檔案邊界</Text>
          </div>
          <div className="content-grid">
            <article className="content-card">
              <Text as="span">press.tsx</Text>
              <Text as="h3">只放順序</Text>
              <Text as="p">`&lt;Slide id /&gt;` 是唯一內容；沒有 layout、資料陣列或 CSS import。</Text>
            </article>
            <article className="content-card">
              <Text as="span">slides/&lt;id&gt;/</Text>
              <Text as="h3">一張一個資料夾</Text>
              <Text as="p">`slide.tsx` 放 JSX、`meta`、`notes`；slide-local assets 或 CSS 也可以放旁邊。</Text>
            </article>
            <article className="content-card">
              <Text as="span">engine</Text>
              <Text as="h3">負責一致性</Text>
              <Text as="p">驗證 missing / orphan / duplicate slide，並在 build 時展開成真正的 Press tree。</Text>
            </article>
          </div>
        </section>
    </DeckSlide>
  );
}
