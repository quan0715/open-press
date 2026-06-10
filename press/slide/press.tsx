import { Press, Slide } from "@open-press/core";

export default function SlidePress() {
  return (
    <Press
      slug="slide"
      title="Hello OpenPress Slide"
      type="slides"
      page="slide-16-9"
      componentsDir="./components"
      mediaDir="./media"
    >
      <Slide id="cover" />
      <Slide id="folder-architecture" />
      <Slide id="closing" />
      <Slide id="authoring-workflow" />
      <Slide id="cli-overview" />
      <Slide id="slide-07" />
      <Slide id="slide-08" />
      <Slide id="slide-09" skip />
    </Press>
  );
}
