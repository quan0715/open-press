import { Text, type SlideMeta } from "@open-press/core";
import { DeckSlide } from "../../components/DeckSlide";

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
    <DeckSlide id="cover" variant="cover">
        <section className="cover-layout">
          <div className="cover-copy">
            <Text as="p" className="kicker">Hello OpenPress Slide</Text>
            <Text as="h1">A new authoring loop for slide decks</Text>
            <Text as="p" className="cover-lede">
              One ordered index, one folder per slide, and engine-owned locators so agents can focus on content instead of wiring.
            </Text>
          </div>
          <figure className="cover-photo-panel">
            <img
              src="/openpress/media/openpress-hero-art.png"
              alt="Abstract editorial illustration of flowing pages and a stacked document"
            />
            <figcaption>folder → slide → workspace</figcaption>
          </figure>
        </section>
    </DeckSlide>
  );
}
