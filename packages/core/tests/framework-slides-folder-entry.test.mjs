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
      generatedDir: "/workspace/.openpress/react",
    });

    assert.match(source, /import Slide0 from "\.\.\/\.\.\/press\/deck\/slides\/cover\/slide\.tsx"/);
    assert.match(source, /import Slide1 from "\.\.\/\.\.\/press\/deck\/slides\/draft\/slide\.tsx"/);
    assert.match(source, /<Slide0 \/>/);
    assert.match(source, /<Slide1 \/>/);
    assert.match(source, /__openpressSlidesIndex/);
    assert.match(source, /\{ id: "draft", skip: true \}/);
    assert.doesNotMatch(source, /<Slide id="cover"><Slide0 \/><\/Slide>/);
  });
});
