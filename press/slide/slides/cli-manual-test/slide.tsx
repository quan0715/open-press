import type { SlideMeta } from "@open-press/core";

export const meta = {
  layout: "blank",
  description: "Manual CLI test slide used to verify add, remove, status, and validation behavior.",
  keypoints: [
    "Created by slide add",
    "Safe to remove after manual testing",
    "Keeps metadata visible in status output"
  ]
} satisfies SlideMeta;

export default function CliManualTestSlide() {
  return null;
}
