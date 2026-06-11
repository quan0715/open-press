import { type SlideMeta } from "@open-press/core";
import { BlankSlide } from "../../layouts/SlideProtocol";

export const meta = {
  layout: "blank",
  description: "Placeholder for a validation checklist slide.",
  keypoints: [
    "Run build",
    "Check slide status",
    "Review generated output"
  ]
} satisfies SlideMeta;

export default function ValidationCheckSlide() {
  return (
    <BlankSlide id="validation-check">
      <BlankSlide.Kicker>Validation</BlankSlide.Kicker>
      <BlankSlide.Title>Check the deck before sharing</BlankSlide.Title>
      <BlankSlide.Body>Run build, inspect slide status, and review rendered output after structural edits.</BlankSlide.Body>
    </BlankSlide>
  );
}
