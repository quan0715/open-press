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

type MdxSourceOptions =
  | { preset: "section-folders"; root?: string }
  | { preset: "section-files"; root?: string }
  | { preset: "file-list"; files: string[] };

const VALID_PRESETS = new Set(["section-folders", "section-files", "file-list"]);

export function mdxSource(options: MdxSourceOptions): MdxSourceDescriptor {
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

  if (options.preset === "section-folders") {
    return normalizeRooted("section-folders", options.root, "chapters") as MdxSourceDescriptorSectionFolders;
  }
  if (options.preset === "section-files") {
    return normalizeRooted("section-files", options.root, "content") as MdxSourceDescriptorSectionFiles;
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
  return { type: "mdx", preset: "file-list", files };
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
