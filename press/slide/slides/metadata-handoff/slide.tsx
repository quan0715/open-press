import { type SlideMeta } from "@open-press/core";
import { BlankSlide } from "../../layouts/SlideProtocol";

export const meta = {
  layout: "blank",
  description: "Placeholder for documenting slide metadata and speaker notes handoff.",
  keypoints: [
    "Meta describes intent",
    "Notes stay workbench-only",
    "Descriptions follow the JSX"
  ]
} satisfies SlideMeta;

export default function MetadataHandoffSlide() {
  return (
    <BlankSlide id="metadata-handoff">
      <BlankSlide.Kicker>Metadata</BlankSlide.Kicker>
      <BlankSlide.Title>Keep intent beside each slide</BlankSlide.Title>
      <BlankSlide.Body>Write meta and notes from the finished JSX so status views and agents have accurate context.</BlankSlide.Body>
    </BlankSlide>
  );
}
