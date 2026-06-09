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
      <Slide id="closing" />
      <Slide id="cover" />
      <Slide id="folder-architecture" />
      <Slide id="cli-overview" />
      <Slide id="authoring-workflow" />
      <Slide id="workspace-interaction" />
      <Slide id="cli-manual-test" />
    </Press>
  );
}
