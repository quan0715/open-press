import { useId } from "react";
import { WorkbenchDialog } from "../dialog";
import type { ProjectPanelPreview } from "./projectPreviewTypes";
import { createProjectObjectEntityId } from "./projectPreviewTypes";

export interface ProjectPreviewDialogProps {
  preview: ProjectPanelPreview;
  onClose: () => void;
}

export function ProjectPreviewDialog({ preview, onClose }: ProjectPreviewDialogProps) {
  const titleId = useId();

  return (
    <WorkbenchDialog
      titleId={titleId}
      title={preview.title}
      className="openpress-project-preview-dialog"
      closeLabel="關閉預覽"
      onClose={onClose}
    >
      <div
        className="openpress-project-preview-dialog__body"
        data-preview-kind={preview.kind}
        data-openpress-object-id={createProjectObjectEntityId(preview.kind, preview.title)}
      >
        {preview.kind === "media" ? (
          <img src={preview.src} alt="" />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: preview.html }} />
        )}
      </div>
    </WorkbenchDialog>
  );
}
