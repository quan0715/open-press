import { Frame, Slide } from "@open-press/core";

export default function CoverSlide() {
  return (
    <Slide id="cover">
      <Frame frameKey="canvas" chrome={false}>
        <h1>Slides E2E Fixture</h1>
      </Frame>
    </Slide>
  );
}
