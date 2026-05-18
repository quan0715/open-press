const ALLOWED_VARIANTS = new Set(["metric", "cover-title", "chapter-title", "section-title", "body", "caption"]);

export function render({ data, helpers }) {
  const { escapeAttr, escapeHtml } = helpers;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  if (rows.length === 0) {
    throw new Error("type-specimen requires data.rows.");
  }
  const ariaLabel = data.ariaLabel || "Typography specimen";

  const body = rows.map((row, index) => renderRow(row, index, helpers)).join("\n  ");

  return `<section class="type-specimen" data-qdoc-component="type-specimen" aria-label="${escapeAttr(ariaLabel)}">\n  ${body}\n</section>`;
}

function renderRow(row, index, helpers) {
  const { escapeAttr, escapeHtml } = helpers;
  const name = requiredString(row?.name, `type-specimen rows[${index}].name`);
  const spec = requiredString(row?.spec, `type-specimen rows[${index}].spec`);
  const sample = requiredString(row?.sample, `type-specimen rows[${index}].sample`);
  const variant = row?.sampleVariant;
  if (typeof variant !== "string" || !ALLOWED_VARIANTS.has(variant)) {
    throw new Error(`type-specimen rows[${index}].sampleVariant must be one of: ${[...ALLOWED_VARIANTS].join(", ")}`);
  }

  return `<div class="type-specimen__row">
    <div class="type-specimen__meta">
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(spec)}</span>
    </div>
    <p class="type-specimen__sample type-specimen__sample--${escapeAttr(variant)}">${escapeHtml(sample)}</p>
  </div>`;
}

function requiredString(value, name) {
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new Error(`${name} is required.`);
}
