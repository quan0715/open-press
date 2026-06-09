import { Text, type SlideMeta } from "@open-press/core";
import { DeckSlide } from "../../components/DeckSlide";

export const meta = {
  layout: "closing",
  description: "Closes with the operating principle of the new slide architecture.",
  keypoints: [
    "Small files",
    "Strict validation",
    "Safer agent workflow"
  ]
} satisfies SlideMeta;

export const notes = "End by repeating the core rule: humans and agents edit slide content; the engine owns identity and consistency.";

export default function ClosingSlide() {
  return (
    <DeckSlide id="closing" variant="closing">
        <section className="conclusion-layout">
          <Text as="p" className="kicker">Next</Text>
          <Text as="h2">更小的檔案，更強的 validation，更安全的 agent workflow</Text>
          <div className="conclusion-points">
            <Text as="p">新增 slide 用 CLI，內容放進自己的資料夾。</Text>
            <Text as="p">互動能力由 engine 注入，authoring surface 保持乾淨。</Text>
          </div>
        </section>
    </DeckSlide>
  );
}
