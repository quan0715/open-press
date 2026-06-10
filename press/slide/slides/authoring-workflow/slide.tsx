import { type SlideMeta } from "@open-press/core";
import { ProcessSlide } from "../../layouts/SlideProtocol";

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
    <ProcessSlide id="authoring-workflow">
      <ProcessSlide.Heading>
        <ProcessSlide.Kicker>03 · 如何新增編輯 Slide</ProcessSlide.Kicker>
        <ProcessSlide.Title>Authoring loop: add → edit → document → validate</ProcessSlide.Title>
      </ProcessSlide.Heading>
      <ProcessSlide.Map>
        <ProcessSlide.Step>
          <ProcessSlide.StepNumber>01</ProcessSlide.StepNumber>
          <ProcessSlide.StepTitle>Add</ProcessSlide.StepTitle>
          <ProcessSlide.Body>`open-press slide add cli-overview` 建 folder 並 append marker。</ProcessSlide.Body>
        </ProcessSlide.Step>
        <ProcessSlide.Step>
          <ProcessSlide.StepNumber>02</ProcessSlide.StepNumber>
          <ProcessSlide.StepTitle>Edit</ProcessSlide.StepTitle>
          <ProcessSlide.Body>直接修改 `slides/&lt;id&gt;/slide.tsx`；不用碰整份 deck。</ProcessSlide.Body>
        </ProcessSlide.Step>
        <ProcessSlide.Step>
          <ProcessSlide.StepNumber>03</ProcessSlide.StepNumber>
          <ProcessSlide.StepTitle>Document</ProcessSlide.StepTitle>
          <ProcessSlide.Body>更新 `meta` 與 `notes`，讓 status 和 workbench 有上下文。</ProcessSlide.Body>
        </ProcessSlide.Step>
        <ProcessSlide.Step>
          <ProcessSlide.StepNumber>04</ProcessSlide.StepNumber>
          <ProcessSlide.StepTitle>Validate</ProcessSlide.StepTitle>
          <ProcessSlide.Body>跑 validate / render，engine 會抓 orphan、duplicate、CSS boundary。</ProcessSlide.Body>
        </ProcessSlide.Step>
      </ProcessSlide.Map>
    </ProcessSlide>
  );
}
