import { type SlideMeta } from "@open-press/core";
import { CardGridSlide } from "../../layouts/SlideProtocol";

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
    <CardGridSlide id="folder-architecture">
      <CardGridSlide.Heading>
        <CardGridSlide.Kicker>01 · Slide Press 資料夾架構</CardGridSlide.Kicker>
        <CardGridSlide.Title>把 deck 拆成可維護的檔案邊界</CardGridSlide.Title>
      </CardGridSlide.Heading>
      <CardGridSlide.Grid>
        <CardGridSlide.Card>
          <CardGridSlide.Label>press.tsx</CardGridSlide.Label>
          <CardGridSlide.CardTitle>只放順序</CardGridSlide.CardTitle>
          <CardGridSlide.Body>`&lt;Slide id /&gt;` 是唯一內容；沒有 layout、資料陣列或 CSS import。</CardGridSlide.Body>
        </CardGridSlide.Card>
        <CardGridSlide.Card>
          <CardGridSlide.Label>slides/&lt;id&gt;/</CardGridSlide.Label>
          <CardGridSlide.CardTitle>一張一個資料夾</CardGridSlide.CardTitle>
          <CardGridSlide.Body>`slide.tsx` 放 JSX、`meta`、`notes`；slide-local assets 或 CSS 也可以放旁邊。</CardGridSlide.Body>
        </CardGridSlide.Card>
        <CardGridSlide.Card>
          <CardGridSlide.Label>engine</CardGridSlide.Label>
          <CardGridSlide.CardTitle>負責一致性</CardGridSlide.CardTitle>
          <CardGridSlide.Body>驗證 missing / orphan / duplicate slide，並在 build 時展開成真正的 Press tree。</CardGridSlide.Body>
        </CardGridSlide.Card>
      </CardGridSlide.Grid>
    </CardGridSlide>
  );
}
