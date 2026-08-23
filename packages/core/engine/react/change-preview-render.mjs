import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../runtime/config.mjs";
import { exportReactDocument } from "./document-export.mjs";
import { readChangePreview } from "./change-preview.mjs";

export async function renderChangePreview({ root = ".", pressSlug } = {}) {
  const preview = await readChangePreview({ root });
  if (!preview) return null;
  let scopedProposals = [];

  try {
    const config = await loadConfig(root);
    scopedProposals = proposalsForPress({
      config,
      pressSlug,
      proposals: preview.proposals,
    });
    if (scopedProposals.length === 0) return { proposals: [] };

    const invalidProposal = scopedProposals.find((proposal) => proposal.matches !== 1);
    if (invalidProposal) {
      return {
        proposals: scopedProposals,
        document: null,
        renderError: invalidProposal.matches === 0
          ? `Proposal ${invalidProposal.index + 1} source text is no longer present.`
          : `Proposal ${invalidProposal.index + 1} source text is not unique.`,
      };
    }

    const { proposals, sourceTextOverrides } = await createChangePreviewSourceOverrides({
      root,
      config,
      proposals: scopedProposals,
    });
    const exported = await exportReactDocument(root, {
      syncAssets: false,
      writeOutput: false,
      pressSlug,
      sourceTextOverrides,
    });
    const press = selectExportedPress(exported, pressSlug);
    if (!press?.readerDocument) {
      throw new Error(pressSlug
        ? `OpenPress change preview could not find Press ${pressSlug}.`
        : "OpenPress change preview could not render a Press.");
    }
    return {
      proposals,
      document: press.readerDocument,
    };
  } catch (error) {
    return {
      proposals: scopedProposals,
      document: null,
      renderError: error instanceof Error ? error.message : String(error),
    };
  }
}

function proposalsForPress({ config, pressSlug, proposals }) {
  const slug = typeof pressSlug === "string" ? pressSlug.trim() : "";
  if (!slug) return proposals;
  const pressRoot = path.relative(
    config.root,
    path.join(config.paths.documentRoot, slug),
  ).replaceAll("\\", "/");
  const prefix = `${pressRoot}/`;
  return proposals.filter((proposal) => proposal.path.startsWith(prefix));
}

export async function createChangePreviewSourceOverrides({ root = ".", config, proposals }) {
  const workspaceRoot = path.resolve(root);
  const proposalsByPath = new Map();
  for (const proposal of proposals) {
    const bucket = proposalsByPath.get(proposal.path) ?? [];
    bucket.push(proposal);
    proposalsByPath.set(proposal.path, bucket);
  }

  const sourceTextOverrides = {};
  const resolvedProposals = new Map();
  for (const [sourcePath, fileProposals] of proposalsByPath) {
    const absolutePath = path.resolve(workspaceRoot, sourcePath);
    if (!absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
      throw new Error(`OpenPress change preview path escapes workspace: ${sourcePath}`);
    }
    const source = await fs.readFile(absolutePath, "utf8");
    const ranges = fileProposals.map((proposal) => {
      const start = source.indexOf(proposal.before);
      if (start < 0 || source.indexOf(proposal.before, start + 1) >= 0) {
        throw new Error(`Proposal ${proposal.index + 1} source text must occur exactly once.`);
      }
      return {
        proposal,
        start,
        end: start + proposal.before.length,
      };
    }).sort((left, right) => left.start - right.start);

    for (let index = 1; index < ranges.length; index += 1) {
      if (ranges[index].start < ranges[index - 1].end) {
        throw new Error(`Proposals ${ranges[index - 1].proposal.index + 1} and ${ranges[index].proposal.index + 1} overlap.`);
      }
    }

    let cursor = 0;
    let nextSource = "";
    for (const range of ranges) {
      nextSource += source.slice(cursor, range.start);
      const afterStart = nextSource.length;
      nextSource += range.proposal.after;
      const afterEnd = nextSource.length;
      resolvedProposals.set(range.proposal.index, {
        ...range.proposal,
        endLine: lineNumberAtOffset(source, Math.max(range.start, range.end - 1)),
        ...(range.proposal.after
          ? {
              afterLine: lineNumberAtOffset(nextSource, afterStart),
              afterEndLine: lineNumberAtOffset(nextSource, Math.max(afterStart, afterEnd - 1)),
            }
          : {}),
      });
      cursor = range.end;
    }
    nextSource += source.slice(cursor);
    addSourceTextOverride(sourceTextOverrides, config, sourcePath, nextSource);
  }

  return {
    proposals: proposals.map((proposal) => resolvedProposals.get(proposal.index) ?? proposal),
    sourceTextOverrides,
  };
}

function addSourceTextOverride(overrides, config, sourcePath, text) {
  const normalizedSourcePath = sourcePath.replaceAll("\\", "/").replace(/^\/+/, "");
  overrides[normalizedSourcePath] = text;
  const documentRootRelative = path.relative(config.root, config.paths.documentRoot).replaceAll("\\", "/");
  if (documentRootRelative && normalizedSourcePath.startsWith(`${documentRootRelative}/`)) {
    overrides[normalizedSourcePath.slice(documentRootRelative.length + 1)] = text;
  }
}

function selectExportedPress(exported, pressSlug) {
  if (!exported || !Array.isArray(exported.presses)) return null;
  if (typeof pressSlug === "string" && pressSlug.trim()) {
    return exported.presses.find((press) => press.slug === pressSlug.trim()) ?? null;
  }
  return exported.presses[0] ?? null;
}

function lineNumberAtOffset(source, offset) {
  return source.slice(0, offset).split(/\r?\n/).length;
}
