import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSlidesFolderPressModule } from "../engine/react/slides-folder-entry.mjs";

describe("slides folder entry generation", () => {
  it("turns marker-only press into imports, slide components, and skip metadata", () => {
    const source = generateSlidesFolderPressModule({
      pressDir: "/workspace/press/deck",
      pressPath: "/workspace/press/deck/press.tsx",
      markers: [
        { id: "cover", skip: false },
        { id: "draft", skip: true },
      ],
      pressPropsSource: 'title="Deck" type="slides" page="slide-16-9"',
      pressScopeSource: 'import { defineSlideTheme } from "@open-press/core/theme";\nconst slideTheme = defineSlideTheme({ name: "Deck" });',
      generatedDir: "/workspace/.openpress/react",
    });

    assert.match(source, /import OpenPressGeneratedSlide0 from "\.\.\/\.\.\/press\/deck\/slides\/cover\/slide\.tsx"/);
    assert.match(source, /import OpenPressGeneratedSlide1 from "\.\.\/\.\.\/press\/deck\/slides\/draft\/slide\.tsx"/);
    assert.match(source, /const slideTheme = defineSlideTheme/);
    assert.match(source, /<OpenPressGeneratedSlide0 \/>/);
    assert.match(source, /<OpenPressGeneratedSlide1 \/>/);
    assert.match(source, /__openpressSlidesIndex/);
    assert.match(source, /\{ id: "draft", skip: true \}/);
    assert.doesNotMatch(source, /<Slide id="cover"><OpenPressGeneratedSlide0 \/><\/Slide>/);
  });
});
