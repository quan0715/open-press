const TOKEN_PATTERN = /^\s*(-?\d*)\s*(?:-\s*(\d*))?\s*$/;

export function parsePageSelector(input) {
  if (typeof input !== "string") {
    throw new TypeError("Page selector must be a string");
  }
  const trimmed = input.trim();
  if (trimmed === "") {
    throw new Error("Page selector is empty; expected something like '3', '3,5-7', or '12-'.");
  }

  const segments = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`Page selector "${input}" has no usable segments.`);
  }

  return segments.map((segment) => parseSegment(segment, input));
}

function parseSegment(segment, original) {
  if (!segment.includes("-")) {
    const value = toPositiveInteger(segment, original);
    return { kind: "single", value };
  }

  if (segment === "-") {
    throw new Error(`Page selector "${original}" contains a bare "-"; ranges need at least one bound.`);
  }

  const dashIndex = segment.indexOf("-");
  if (segment.indexOf("-", dashIndex + 1) !== -1) {
    throw new Error(`Page selector segment "${segment}" has too many dashes.`);
  }

  const leftRaw = segment.slice(0, dashIndex);
  const rightRaw = segment.slice(dashIndex + 1);
  const from = leftRaw.trim() === "" ? null : toPositiveInteger(leftRaw, original);
  const to = rightRaw.trim() === "" ? null : toPositiveInteger(rightRaw, original);

  if (from != null && to != null && from > to) {
    throw new Error(`Page selector range "${segment}" goes backwards (${from} > ${to}).`);
  }

  return { kind: "range", from, to };
}

function toPositiveInteger(raw, original) {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Page selector "${original}" contains non-integer token "${raw}".`);
  }
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Page selector "${original}" contains out-of-range page number "${raw}"; pages start at 1.`);
  }
  return value;
}

export function resolvePageSelector(spec, totalPages) {
  if (!Array.isArray(spec)) {
    throw new TypeError("resolvePageSelector expects a parsed selector array");
  }
  if (!Number.isInteger(totalPages) || totalPages < 0) {
    throw new TypeError("resolvePageSelector expects a non-negative integer totalPages");
  }
  if (totalPages === 0) return [];

  const selected = new Set();
  for (const segment of spec) {
    if (segment.kind === "single") {
      if (segment.value > totalPages) {
        throw new Error(`Page ${segment.value} is out of range; document has ${totalPages} page(s).`);
      }
      selected.add(segment.value);
      continue;
    }
    const from = segment.from ?? 1;
    const to = segment.to ?? totalPages;
    if (from > totalPages) {
      throw new Error(`Range start ${from} is out of range; document has ${totalPages} page(s).`);
    }
    const upper = Math.min(to, totalPages);
    for (let i = from; i <= upper; i += 1) selected.add(i);
  }

  return Array.from(selected).sort((a, b) => a - b);
}
