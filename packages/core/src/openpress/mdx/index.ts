// @open-press/core/mdx — pure source descriptor factories.
//
// These factories MUST stay pure: they construct descriptor objects only.
// They must not touch the filesystem, fetch the network, or execute
// workspace logic at module load. Resolution happens in Layer 1 inside the
// engine, where IO is allowed.

import type {
  MdxSourceDescriptor,
  MdxSourceDescriptorFileList,
  MdxSourceDescriptorSectionFiles,
  MdxSourceDescriptorSectionFolders,
} from "../core/types";

export type {
  MdxSourceDescriptor,
  MdxSourceDescriptorFileList,
  MdxSourceDescriptorSectionFiles,
  MdxSourceDescriptorSectionFolders,
} from "../core/types";

export type {
  OutlineItem,
  ResolvedSource,
  SourceBlock,
  SourceFileRecord,
  SourceNode,
} from "../core/types";

// All presets accept an optional `id` for the 1.0 contract where sources
// are an array passed via <Press sources>. In v0.x the id came from the
// record key in `export const sources = { story: mdxSource(...) }`.
type MdxSourceOptions =
  | { id?: string; preset: "section-folders"; root?: string }
  | { id?: string; preset: "section-files"; root?: string }
  | { id?: string; preset: "file-list"; files: string[] };

const VALID_PRESETS = new Set(["section-folders", "section-files", "file-list"]);

export function mdxSource(options: MdxSourceOptions): MdxSourceDescriptor & { id?: string } {
  if (!options || typeof options !== "object") {
    throw new Error("mdxSource() requires an options object.");
  }
  if (!VALID_PRESETS.has(options.preset)) {
    throw new Error(
      `mdxSource() preset must be one of: section-folders, section-files, file-list. Got "${
        (options as { preset?: unknown }).preset
      }".`,
    );
  }

  const id = typeof options.id === "string" && options.id.trim() ? options.id.trim() : undefined;

  if (options.preset === "section-folders") {
    const desc = normalizeRooted("section-folders", options.root, "chapters") as MdxSourceDescriptorSectionFolders;
    return id ? { ...desc, id } : desc;
  }
  if (options.preset === "section-files") {
    const desc = normalizeRooted("section-files", options.root, "content") as MdxSourceDescriptorSectionFiles;
    return id ? { ...desc, id } : desc;
  }

  // file-list
  if (!Array.isArray(options.files)) {
    throw new Error('mdxSource({ preset: "file-list" }) requires `files: string[]`.');
  }
  const files: string[] = [];
  for (const raw of options.files) {
    if (typeof raw !== "string") {
      throw new Error('mdxSource({ preset: "file-list" }) `files` entries must be strings.');
    }
    const trimmed = raw.trim();
    if (!trimmed) continue;
    files.push(trimmed);
  }
  if (files.length === 0) {
    throw new Error('mdxSource({ preset: "file-list" }) requires at least one file.');
  }
  const desc: MdxSourceDescriptor = { type: "mdx", preset: "file-list", files };
  return id ? { ...desc, id } : desc;
}

function normalizeRooted(
  preset: "section-folders" | "section-files",
  root: string | undefined,
  defaultRoot: string,
): MdxSourceDescriptor {
  if (root !== undefined && typeof root !== "string") {
    throw new Error(`mdxSource() \`root\` must be a string if provided. Got ${typeof root}.`);
  }
  return {
    type: "mdx",
    preset,
    root: (root ?? defaultRoot).trim() || defaultRoot,
  };
}
