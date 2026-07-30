import fs from "node:fs/promises";
import path from "node:path";
import { isEditableCommentPath } from "./comment-marker.mjs";

export const CHANGE_PREVIEW_RELATIVE_PATH = ".openpress/review/current.json";
const CHANGE_FEEDBACK_DECISIONS = new Set(["accept", "reject", "more-info"]);
const feedbackWriteQueues = new Map();

export async function readChangePreview({ root = "." } = {}) {
  const workspaceRoot = path.resolve(root);
  const previewPath = path.join(workspaceRoot, CHANGE_PREVIEW_RELATIVE_PATH);
  let text;

  try {
    text = await fs.readFile(previewPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }

  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`OpenPress change preview is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!value || typeof value !== "object" || !Array.isArray(value.proposals)) {
    throw new Error("OpenPress change preview requires a `proposals` array.");
  }

  const sourceCache = new Map();
  const proposals = [];
  for (const [index, proposal] of value.proposals.entries()) {
    proposals.push(await resolveProposal({
      workspaceRoot,
      proposal,
      index,
      sourceCache,
    }));
  }

  return { proposals };
}

export async function updateChangeProposalFeedback({
  root = ".",
  index,
  path: expectedPath,
  before: expectedBefore,
  after: expectedAfter,
  decision,
  comment,
} = {}) {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("OpenPress change feedback requires a valid proposal index.");
  }

  const workspaceRoot = path.resolve(root);
  const previewPath = path.join(workspaceRoot, CHANGE_PREVIEW_RELATIVE_PATH);
  return enqueueFeedbackWrite(previewPath, async () => {
    const result = await updateStoredProposalFeedback({
      previewPath,
      index,
      expectedPath,
      expectedBefore,
      expectedAfter,
      decision,
      comment,
    });
    return result;
  });
}

async function updateStoredProposalFeedback({
  previewPath,
  index,
  expectedPath,
  expectedBefore,
  expectedAfter,
  decision,
  comment,
}) {
  let value;
  try {
    value = JSON.parse(await fs.readFile(previewPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("OpenPress change preview no longer exists.");
    if (error instanceof SyntaxError) throw new Error(`OpenPress change preview is not valid JSON: ${error.message}`);
    throw error;
  }

  if (!value || typeof value !== "object" || !Array.isArray(value.proposals)) {
    throw new Error("OpenPress change preview requires a `proposals` array.");
  }
  const proposal = value.proposals[index];
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw new Error(`OpenPress change proposal ${index + 1} no longer exists.`);
  }
  const storedPath = normalizeProposalPath(proposal.path, `OpenPress change proposal ${index + 1}`);
  if (storedPath !== expectedPath || proposal.before !== expectedBefore || proposal.after !== expectedAfter) {
    throw new Error(`OpenPress change proposal ${index + 1} changed. Refresh before leaving feedback.`);
  }

  const normalizedDecision = normalizeFeedbackDecision(decision, `OpenPress change proposal ${index + 1}`);
  const normalizedComment = normalizeFeedbackComment(comment, `OpenPress change proposal ${index + 1}`);
  const feedback = normalizedDecision || normalizedComment
    ? {
        ...(normalizedDecision ? { decision: normalizedDecision } : {}),
        ...(normalizedComment ? { comment: normalizedComment } : {}),
      }
    : undefined;

  if (feedback) proposal.feedback = feedback;
  else delete proposal.feedback;
  await writePreviewAtomically(previewPath, value);
  return { index, feedback };
}

async function enqueueFeedbackWrite(previewPath, operation) {
  const previous = feedbackWriteQueues.get(previewPath) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  feedbackWriteQueues.set(previewPath, current);
  try {
    return await current;
  } finally {
    if (feedbackWriteQueues.get(previewPath) === current) feedbackWriteQueues.delete(previewPath);
  }
}

async function writePreviewAtomically(previewPath, value) {
  const temporaryPath = `${previewPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await fs.rename(temporaryPath, previewPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function resolveProposal({ workspaceRoot, proposal, index, sourceCache }) {
  const label = `OpenPress change proposal ${index + 1}`;
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw new Error(`${label} must be an object.`);
  }

  const sourcePath = normalizeProposalPath(proposal.path, label);
  const before = requiredText(proposal.before, `${label} requires non-empty \`before\` text.`);
  const after = stringText(proposal.after, `${label} requires string \`after\` text.`);
  if (before === after) throw new Error(`${label} does not change its source text.`);
  const note = typeof proposal.note === "string" && proposal.note.trim()
    ? proposal.note.trim()
    : undefined;
  const feedback = normalizeStoredFeedback(proposal.feedback, label);

  let source = sourceCache.get(sourcePath);
  if (source === undefined) {
    const absolutePath = path.resolve(workspaceRoot, sourcePath);
    if (!absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
      throw new Error(`${label} path escapes the OpenPress workspace.`);
    }
    try {
      source = await fs.readFile(absolutePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") throw new Error(`${label} source file does not exist: ${sourcePath}`);
      throw error;
    }
    sourceCache.set(sourcePath, source);
  }

  const matchIndexes = findExactMatches(source, before);
  const firstMatchIndex = matchIndexes[0];

  return {
    index,
    path: sourcePath,
    before,
    after,
    ...(note ? { note } : {}),
    ...(feedback ? { feedback } : {}),
    matches: matchIndexes.length,
    ...(firstMatchIndex === undefined ? {} : { line: lineNumberAtOffset(source, firstMatchIndex) }),
  };
}

function normalizeStoredFeedback(value, label) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} feedback must be an object.`);
  }
  const decision = normalizeFeedbackDecision(value.decision, label);
  const comment = normalizeFeedbackComment(value.comment, label);
  return decision || comment
    ? {
        ...(decision ? { decision } : {}),
        ...(comment ? { comment } : {}),
      }
    : undefined;
}

function normalizeFeedbackDecision(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !CHANGE_FEEDBACK_DECISIONS.has(value)) {
    throw new Error(`${label} feedback decision must be accept, reject, or more-info.`);
  }
  return value;
}

function normalizeFeedbackComment(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${label} feedback comment must be text.`);
  return value.trim() || undefined;
}

function normalizeProposalPath(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} requires a source \`path\`.`);
  }
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (path.posix.isAbsolute(normalized) || normalized.includes("\0") || normalized.startsWith("../")) {
    throw new Error(`${label} has an invalid source path: ${value}`);
  }
  const posixPath = path.posix.normalize(normalized);
  if (posixPath === ".." || posixPath.startsWith("../")) {
    throw new Error(`${label} has an invalid source path: ${value}`);
  }
  if (!isEditableCommentPath(posixPath)) {
    throw new Error(`${label} must target an editable OpenPress MDX or TSX source: ${posixPath}`);
  }
  return posixPath;
}

function requiredText(value, message) {
  if (typeof value !== "string" || !value) throw new Error(message);
  return value;
}

function stringText(value, message) {
  if (typeof value !== "string") throw new Error(message);
  return value;
}

function findExactMatches(source, value) {
  const matches = [];
  let offset = 0;
  while (offset <= source.length - value.length) {
    const index = source.indexOf(value, offset);
    if (index === -1) break;
    matches.push(index);
    offset = index + 1;
  }
  return matches;
}

function lineNumberAtOffset(source, offset) {
  return source.slice(0, offset).split(/\r?\n/).length;
}
