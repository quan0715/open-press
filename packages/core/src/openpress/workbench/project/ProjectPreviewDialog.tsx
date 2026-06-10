import { useId } from "react";
import { WorkbenchDialog } from "../dialog";
import type { ProjectPanelPreview } from "./projectPreviewTypes";
import { createProjectObjectEntityId } from "./projectPreviewTypes";

export interface ProjectPreviewDialogProps {
  preview: ProjectPanelPreview;
  onClose: () => void;
}

const PREVIEW_DIALOG_CLASS = "w-[min(860px,calc(100vw_-_56px))]";
const PREVIEW_BODY_BASE_CLASS = "min-h-0 min-w-0 overflow-auto px-6 pb-6 pt-3";
const PREVIEW_MEDIA_BODY_CLASS = [
  PREVIEW_BODY_BASE_CLASS,
  "grid place-items-center bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]",
  "[background-image:linear-gradient(45deg,rgb(255_255_255_/_0.03)_25%,transparent_25%),linear-gradient(-45deg,rgb(255_255_255_/_0.03)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgb(255_255_255_/_0.03)_75%),linear-gradient(-45deg,transparent_75%,rgb(255_255_255_/_0.03)_75%)]",
].join(" ");
const PREVIEW_COMPONENT_BODY_CLASS = `${PREVIEW_BODY_BASE_CLASS} bg-[#f7f9fb] text-[var(--openpress-color-ink)]`;

export function ProjectPreviewDialog({ preview, onClose }: ProjectPreviewDialogProps) {
  const titleId = useId();

  return (
    <WorkbenchDialog
      titleId={titleId}
      title={preview.title}
      className={PREVIEW_DIALOG_CLASS}
      closeLabel="關閉預覽"
      onClose={onClose}
    >
      <div
        className={preview.kind === "media" ? PREVIEW_MEDIA_BODY_CLASS : PREVIEW_COMPONENT_BODY_CLASS}
        data-preview-kind={preview.kind}
        data-openpress-object-id={createProjectObjectEntityId(preview.kind, preview.title)}
      >
        {preview.kind === "media" ? (
          <img className="block max-h-[calc(100vh_-_160px)] max-w-full object-contain" src={preview.src} alt="" />
        ) : (
          <div className="min-w-min" dangerouslySetInnerHTML={{ __html: preview.html }} />
        )}
      </div>
    </WorkbenchDialog>
  );
}
