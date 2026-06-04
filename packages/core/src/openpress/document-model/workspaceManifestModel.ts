// Shape of /openpress/workspace.json — the reader fetches this on
// boot to decide between gallery routing (multi-Press) and direct
// load (single Press). One entry per discovered Press folder.
import type { PressType } from "./documentTypes";

export interface WorkspaceManifest {
  version: 1;
  // <Workspace name="..."> prop. Null when the user did not set one.
  // Surfaced as the gallery header in the reader.
  name: string | null;
  presses: WorkspaceManifestPress[];
}

export interface WorkspaceManifestPress {
  // Slug for this Press. Matches the folder-convention Press slug.
  slug: string;
  // <Press title="..."> prop. Required in v1.0 contract.
  title: string;
  // Creation mode declared by <Press type>. The reader uses this for
  // mode-specific navigation affordances.
  type: PressType;
  // Page geometry summary. Same shape as the reader's
  // ReaderDocument.theme — readers can show a thumb in the gallery
  // without loading the full document.json.
  page: {
    pagePreset?: string;
    pageLabel?: string;
    pageWidth?: string;
    pageHeight?: string;
    pageAspectRatio?: string;
    pageHeightRatio?: string;
  } | null;
  // Number of pages produced for this Press.
  pageCount: number;
  // Absolute path the reader fetches for this Press's full document.json.
  documentUrl: string;
}

// True when the reader should render the gallery first instead of
// going straight into a single Press's document.
export function manifestHasMultiplePresses(manifest: WorkspaceManifest): boolean {
  return manifest.presses.length > 1;
}

// Find a Press entry by slug. Returns null when the slug is unknown.
export function findManifestPress(
  manifest: WorkspaceManifest,
  slug: string,
): WorkspaceManifestPress | null {
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  for (const press of manifest.presses) {
    const normalizedSlug = press.slug.replace(/^\/+|\/+$/g, "");
    if (normalizedSlug === normalized) return press;
  }
  return null;
}
