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
      <Slide id="user-brief" />
      <Slide id="why-openpress-agents" />
      <Slide id="openpress-model" />
      <Slide id="agent-boundary" />
      <Slide id="workflow-map" />
      <Slide id="step-brief" />
      <Slide id="step-scaffold" />
      <Slide id="step-outline" />
      <Slide id="step-draft" />
      <Slide id="step-assets" />
      <Slide id="step-illustration" />
      <Slide id="step-review" />
      <Slide id="step-validate" />
      <Slide id="prompt-pack" />
      <Slide id="delivery" />
    </Press>
  );
}
