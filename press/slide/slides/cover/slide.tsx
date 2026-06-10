import { type SlideMeta } from "@open-press/core";
import { TitleSlide } from "../../layouts/SlideProtocol";

export const meta = {
  layout: "cover",
  description: "Title slide introducing the new OpenPress slide architecture.",
  keypoints: [
    "Hello OpenPress Slide",
    "Folder-per-slide authoring",
    "Engine-owned identity"
  ],
  visuals: [
    "openpress-hero-art.png"
  ]
} satisfies SlideMeta;

export const notes = "Open with the reason for the change: slide decks should be easy to reorder, inspect, and edit without a giant press.tsx file.";

export default function CoverSlide() {
  return (
    <TitleSlide id="cover">
      <TitleSlide.Content>
        <TitleSlide.Kicker>Hello OpenPress Slide</TitleSlide.Kicker>
        <TitleSlide.Title>A new authoring loop for slide decks</TitleSlide.Title>
        <TitleSlide.Subtitle>
          One ordered index, one folder per slide, and engine-owned locators so agents can focus on content instead of wiring.
        </TitleSlide.Subtitle>
      </TitleSlide.Content>
      <TitleSlide.Media>
        <TitleSlide.Image
          src="/openpress/media/openpress-hero-art.png"
          alt="Abstract editorial illustration of flowing pages and a stacked document"
        />
        <TitleSlide.MediaCaption>
          folder → slide → workspace
        </TitleSlide.MediaCaption>
      </TitleSlide.Media>
    </TitleSlide>
  );
}
