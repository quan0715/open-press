const CSS_LENGTH_RE = /^(\d+(?:\.\d+)?)(px|mm|cm|in|pt|pc)$/i;

export const PAGE_GEOMETRY_PRESETS = {
  a4: {
    id: "a4",
    label: "A4 Page",
    width: "210mm",
    height: "297mm",
  },
  "social-square": {
    id: "social-square",
    label: "Social Square",
    width: "1080px",
    height: "1080px",
  },
  "slide-16-9": {
    id: "slide-16-9",
    label: "Slide 16:9",
    width: "1920px",
    height: "1080px",
  },
};

export function normalizePageGeometry(value) {
  if (value == null || value === false) return null;

  if (typeof value === "string") {
    return presetPageGeometry(value);
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("OpenPress config page must be a preset name or an object.");
  }

  const preset = typeof value.preset === "string" ? presetPageGeometry(value.preset) : null;
  const width = cssLengthValue(value.width, preset?.width);
  const height = cssLengthValue(value.height, preset?.height);
  if (!width || !height) {
    throw new Error("OpenPress config page requires width and height when no preset is provided.");
  }

  const id = optionalId(value.id, preset?.id ?? "custom");
  const label = optionalLabel(value.label, preset?.label ?? "Custom Page");

  return pageGeometry({
    id,
    label,
    width,
    height,
  });
}

export function pageGeometryToTheme(page) {
  if (!page) return undefined;
  return {
    pagePreset: page.id,
    pageLabel: page.label,
    pageWidth: page.width,
    pageHeight: page.height,
    pageAspectRatio: page.aspectRatio,
    pageHeightRatio: page.heightRatio,
  };
}

function presetPageGeometry(id) {
  const preset = PAGE_GEOMETRY_PRESETS[id];
  if (!preset) {
    throw new Error(
      `Unknown OpenPress page preset: "${id}". ` +
        `Available presets: ${Object.keys(PAGE_GEOMETRY_PRESETS).join(", ")}.`,
    );
  }
  return pageGeometry(preset);
}

function pageGeometry({ id, label, width, height }) {
  const ratio = sameUnitRatio(width, height);
  return {
    id,
    label,
    width,
    height,
    aspectRatio: ratio ? `${trimNumber(ratio.width)} / ${trimNumber(ratio.height)}` : undefined,
    heightRatio: ratio ? trimNumber(ratio.height / ratio.width) : undefined,
  };
}

function cssLengthValue(value, fallback) {
  if (value == null) return fallback ?? null;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("OpenPress page width/height must be CSS length strings.");
  }
  const trimmed = value.trim();
  if (!CSS_LENGTH_RE.test(trimmed)) {
    throw new Error(`OpenPress page size must be an absolute CSS length, got: ${trimmed}`);
  }
  return trimmed;
}

function optionalId(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/i.test(value)) {
    throw new Error("OpenPress page id must be a simple slug.");
  }
  return value;
}

function optionalLabel(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("OpenPress page label must be a non-empty string.");
  }
  return value.trim();
}

function sameUnitRatio(width, height) {
  const w = parseCssLength(width);
  const h = parseCssLength(height);
  if (!w || !h || w.unit.toLowerCase() !== h.unit.toLowerCase()) return null;
  return { width: w.value, height: h.value };
}

function parseCssLength(value) {
  const match = CSS_LENGTH_RE.exec(value);
  if (!match) return null;
  return { value: Number(match[1]), unit: match[2] };
}

function trimNumber(value) {
  return Number(value.toFixed(6)).toString();
}
