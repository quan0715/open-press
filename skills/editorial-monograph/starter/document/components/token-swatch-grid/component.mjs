const ALLOWED_VAR_RE = /^var\(--[a-z0-9-]+(?:\s*,\s*[^()]*)?\)$|^#[0-9a-fA-F]{3,8}$/;

export function render({ data, helpers }) {
  const { escapeAttr, escapeHtml } = helpers;
  const swatches = Array.isArray(data?.swatches) ? data.swatches : [];
  if (swatches.length === 0) {
    throw new Error("token-swatch-grid requires data.swatches.");
  }
  const ariaLabel = data.ariaLabel || "Color specimen";

  const body = swatches.map((swatch, index) => renderSwatch(swatch, index, helpers)).join("\n  ");

  return `<section class="token-swatch-grid" data-qdoc-component="token-swatch-grid" aria-label="${escapeAttr(ariaLabel)}">\n  ${body}\n</section>`;
}

function renderSwatch(swatch, index, helpers) {
  const { classNames, escapeAttr, escapeHtml } = helpers;
  const name = requiredString(swatch?.name, `token-swatch-grid swatches[${index}].name`);
  const hex = requiredString(swatch?.hex, `token-swatch-grid swatches[${index}].hex`);
  const summary = requiredString(swatch?.summary, `token-swatch-grid swatches[${index}].summary`);
  const swatchVar = safeCssValue(swatch?.swatchVar, `token-swatch-grid swatches[${index}].swatchVar`);
  const swatchBorderVar = swatch?.swatchBorderVar
    ? safeCssValue(swatch.swatchBorderVar, `token-swatch-grid swatches[${index}].swatchBorderVar`)
    : null;
  const dark = Boolean(swatch?.dark);

  const classes = classNames("token-swatch", dark && "token-swatch--dark");
  const styleParts = [`--swatch: ${swatchVar}`];
  if (swatchBorderVar) styleParts.push(`--swatch-border: ${swatchBorderVar}`);
  const style = `${styleParts.join("; ")};`;

  return `<article class="${escapeAttr(classes)}" style="${escapeAttr(style)}">
    <div class="token-swatch__sample"></div>
    <div class="token-swatch__body">
      <h4>${escapeHtml(name)}</h4>
      <code>${escapeHtml(hex)}</code>
      <p>${escapeHtml(summary)}</p>
    </div>
  </article>`;
}

function requiredString(value, name) {
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new Error(`${name} is required.`);
}

function safeCssValue(value, name) {
  const v = requiredString(value, name);
  if (!ALLOWED_VAR_RE.test(v)) {
    throw new Error(`${name} must be a CSS variable like var(--token) or a hex literal; got: ${v}`);
  }
  return v;
}
