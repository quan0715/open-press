import { type SlideMeta } from "@open-press/core";
import { StatementSlide } from "../../layouts/SlideProtocol";

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
    <StatementSlide id="closing">
      <StatementSlide.Kicker>Next</StatementSlide.Kicker>
      <StatementSlide.Statement>更小的檔案，更強的 validation，更安全的 agent workflow</StatementSlide.Statement>
      <StatementSlide.Support>
        <StatementSlide.SupportText>新增 slide 用 CLI，內容放進自己的資料夾。</StatementSlide.SupportText>
        <StatementSlide.SupportText>互動能力由 engine 注入，authoring surface 保持乾淨。</StatementSlide.SupportText>
      </StatementSlide.Support>
    </StatementSlide>
  );
}
