import { Text, type SlideMeta } from "@open-press/core";
import { DeckSlide } from "../../components/DeckSlide";

export const meta = {
  layout: "process",
  description: "Shows the practical workflow for adding and editing slides in the new architecture.",
  keypoints: [
    "Add with CLI",
    "Edit slide.tsx directly",
    "Document meta and notes",
    "Validate before sharing"
  ]
} satisfies SlideMeta;

export const notes = "Walk through this as the default agent workflow: create with CLI, then edit only the slide folder content.";

export default function AuthoringWorkflowSlide() {
  return (
    <DeckSlide id="authoring-workflow" variant="process">
        <section className="process-layout">
          <div className="process-heading">
            <Text as="p" className="kicker">03 · 如何新增編輯 Slide</Text>
            <Text as="h2">Authoring loop: add → edit → document → validate</Text>
          </div>
          <div className="process-map">
            <article className="process-step">
              <Text as="span">01</Text>
              <Text as="h3">Add</Text>
              <Text as="p">`open-press slide add cli-overview` 建 folder 並 append marker。</Text>
            </article>
            <article className="process-step">
              <Text as="span">02</Text>
              <Text as="h3">Edit</Text>
              <Text as="p">直接修改 `slides/&lt;id&gt;/slide.tsx`；不用碰整份 deck。</Text>
            </article>
            <article className="process-step">
              <Text as="span">03</Text>
              <Text as="h3">Document</Text>
              <Text as="p">更新 `meta` 與 `notes`，讓 status 和 workbench 有上下文。</Text>
            </article>
            <article className="process-step">
              <Text as="span">04</Text>
              <Text as="h3">Validate</Text>
              <Text as="p">跑 validate / render，engine 會抓 orphan、duplicate、CSS boundary。</Text>
            </article>
          </div>
        </section>
    </DeckSlide>
  );
}
