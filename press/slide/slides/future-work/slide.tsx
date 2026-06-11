import { type SlideMeta } from "@open-press/core";
import { BlankSlide } from "../../layouts/SlideProtocol";

export const meta = {
  layout: "blank",
  description: "Skipped placeholder for future slide architecture work.",
  keypoints: [
    "Future slide",
    "Hidden by default",
    "Ready for expansion"
  ]
} satisfies SlideMeta;

export default function FutureWorkSlide() {
  return (
    <BlankSlide id="future-work">
      <BlankSlide.Kicker>Future</BlankSlide.Kicker>
      <BlankSlide.Title>Reserved for follow-up work</BlankSlide.Title>
      <BlankSlide.Body>This skipped slide can hold future details without changing the visible deck order.</BlankSlide.Body>
    </BlankSlide>
  );
}
