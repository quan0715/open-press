import { type SlideMeta } from "@open-press/core";
import { BlankSlide } from "../../layouts/SlideProtocol";

export const meta = {
  layout: "blank",
  description: "New slide placeholder for slide-07. Replace this with the slide purpose before sharing.",
  keypoints: [
    "Add slide content",
    "Update metadata",
    "Run validate"
  ]
} satisfies SlideMeta;

export default function Slide07Slide() {
  return (
    <BlankSlide id="slide-07">
      <BlankSlide.Kicker>New slide</BlankSlide.Kicker>
      <BlankSlide.Title>slide-07</BlankSlide.Title>
      <BlankSlide.Body>Replace this placeholder with slide content, then update meta and notes.</BlankSlide.Body>
    </BlankSlide>
  );
}
