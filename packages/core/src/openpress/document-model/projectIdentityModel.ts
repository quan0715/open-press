import type { DocumentMeta } from "./documentTypes";

export interface ProjectIdentity {
  name: string;
  subtitle: string;
  label: string;
}

export function getProjectIdentity(meta: DocumentMeta): ProjectIdentity {
  return {
    name: meta.organization ?? "",
    subtitle: meta.subtitle ?? "",
    label: meta.workspaceLabel ?? "",
  };
}
