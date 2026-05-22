import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { x as extract } from "tar";

export interface DegitOptions {
  /** GitHub owner. */
  owner: string;
  /** GitHub repo name. */
  repo: string;
  /** Branch or tag. Defaults to HEAD (default branch). */
  ref?: string;
  /** Destination directory (will be created). */
  dest: string;
  /** Limit extraction to a subdirectory inside the repo (e.g. "packages/core"). */
  subdir?: string;
}

/**
 * Fetches a GitHub tarball and extracts the contents into `dest`.
 * Optionally limits extraction to a subdirectory of the repo.
 */
export async function degit({ owner, repo, ref = "main", dest, subdir }: DegitOptions): Promise<void> {
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/${ref}`;
  const tmpDir = await mkdir(path.join(tmpdir(), `open-press-degit-${Date.now()}`), { recursive: true });
  const tarballPath = path.join(tmpDir!, "repo.tar.gz");

  try {
    await fetchTo(url, tarballPath);
    await mkdir(dest, { recursive: true });

    // GitHub tarballs wrap everything in a top-level <repo>-<ref>/ directory.
    // strip:1 removes that wrapper. If subdir is provided, we additionally strip
    // those segments and filter so only that subtree extracts.
    const subdirSegments = subdir ? subdir.split("/").filter(Boolean).length : 0;
    const totalStrip = 1 + subdirSegments;
    const filterPrefix = subdir ? subdir.replace(/\/$/, "") + "/" : null;

    await extract({
      file: tarballPath,
      cwd: dest,
      strip: totalStrip,
      filter: (filePath) => {
        // tar entries look like `<repo>-<ref>/path/inside/repo/...`.
        // Drop the wrapper segment for our matching logic.
        const segments = filePath.split("/");
        const inside = segments.slice(1).join("/");
        if (filterPrefix) {
          return inside.startsWith(filterPrefix);
        }
        return true;
      },
    });
  } finally {
    await rm(tmpDir!, { recursive: true, force: true }).catch(() => {});
  }
}

async function fetchTo(url: string, destFile: string): Promise<void> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(destFile));
}

export async function pathIsEmpty(target: string): Promise<boolean> {
  try {
    const s = await stat(target);
    if (!s.isDirectory()) return false;
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(target);
    return entries.length === 0;
  } catch {
    return true;
  }
}
