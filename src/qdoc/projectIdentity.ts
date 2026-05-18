import type { QDocMeta } from "./types";

export interface QDocProjectIdentity {
  name: string;
  subtitle: string;
  label: string;
}

export function getQDocProjectIdentity(meta: QDocMeta): QDocProjectIdentity {
  return {
    name: meta.organization ?? "",
    subtitle: meta.subtitle ?? "",
    label: meta.workspaceLabel ?? "",
  };
}
