import { Press, Slide } from "@open-press/core";

export default function SlidesE2EPress() {
  return (
    <Press slug="slides" title="Slides E2E Fixture" type="slides" page="slide-16-9">
      <Slide id="cover" />
    </Press>
  );
}
