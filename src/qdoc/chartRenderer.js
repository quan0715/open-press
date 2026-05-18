const DONUT_RADIUS = 70;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const LINE_CHART_BOUNDS = {
  width: 700,
  height: 270,
  gridLeft: 80,
  gridRight: 660,
  plotLeft: 138,
  plotRight: 602,
  plotTop: 60,
  plotBottom: 220,
};

export function renderChartFigure({ type, data, variant }) {
  const chartType = requiredChartType(type ?? data?.chartType ?? data?.type);
  const chartVariant = variant ?? data?.variant ?? chartType;

  if (chartType === "bar") return renderBarChart(data, chartVariant);
  if (chartType === "donut") return renderDonutChart(data, chartVariant);
  if (chartType === "line") return renderLineChart(data, chartVariant);
  throw new Error(`Unsupported qdoc-chart type: ${chartType}`);
}

export function inferChartType(data) {
  const explicitType = typeof data?.chartType === "string" && data.chartType
    ? data.chartType
    : typeof data?.type === "string" && data.type
      ? data.type
      : null;
  if (explicitType) return requiredChartType(explicitType);
  if (data?.center) return "donut";
  return "bar";
}

function renderBarChart(data, variant) {
  const unit = data.unit ?? "";
  const baselinePrefix = data.baselinePrefix ?? "Baseline";
  const items = requireItems(data, "bar");
  const metrics = items.map((item, index) => {
    const value = formatPercentValue(item.value);
    const baseline = formatPercentValue(item.baseline ?? 0);
    const baselineLabel = item.baselineLabel ?? `${baselinePrefix} ${formatDisplayValue(item.baseline ?? 0, unit)}`;
    return [
      `    <div class="exam-feedback__metric" data-chart-index="${index + 1}" style="--value: ${value}%; --baseline: ${baseline}%;">`,
      `      <span class="exam-feedback__label">${escapeHtml(item.label)}</span>`,
      '      <span class="exam-feedback__bar">',
      '        <span class="exam-feedback__fill"></span>',
      `        <span class="exam-feedback__marker" data-label="${escapeAttr(baselineLabel)}"></span>`,
      "      </span>",
      `      <span class="exam-feedback__value">${escapeHtml(formatDisplayValue(item.value, unit))}</span>`,
      "    </div>",
    ].join("\n");
  }).join("\n");

  return [
    `<figure class="${chartClasses("bar", variant)}" data-qdoc-chart="bar" data-variant="${escapeAttr(variant)}" aria-label="${escapeAttr(data.ariaLabel ?? data.title ?? "Bar chart")}">`,
    '  <div class="exam-feedback__metrics">',
    metrics,
    "  </div>",
    `  <figcaption>圖：${escapeHtml(data.caption ?? data.title ?? "")}</figcaption>`,
    "</figure>",
  ].join("\n");
}

function renderDonutChart(data, variant) {
  const items = requireItems(data, "donut");
  const total = items.reduce((sum, item) => sum + numberValue(item.value), 0);
  let offset = 0;
  const segments = items.map((item, index) => {
    const value = numberValue(item.value);
    const arc = total > 0 ? (value / total) * DONUT_CIRCUMFERENCE : 0;
    const dashOffset = -offset;
    offset += arc;
    return [
      `        <circle class="cost-donut__segment" data-chart-index="${index + 1}" cx="100" cy="100" r="${DONUT_RADIUS}"`,
      `                stroke-dasharray="${formatSvgNumber(arc)} ${formatSvgNumber(DONUT_CIRCUMFERENCE - arc)}"`,
      `                stroke-dashoffset="${formatSvgNumber(dashOffset)}" />`,
    ].join("\n");
  }).join("\n");
  const legend = items.map((item, index) => [
    `      <li class="cost-donut__item" data-chart-index="${index + 1}">`,
    '        <span class="cost-donut__swatch"></span>',
    `        <span class="cost-donut__name">${escapeHtml(item.label)}</span>`,
    `        <span class="cost-donut__pct">${escapeHtml(formatDisplayValue(item.value, data.unit ?? ""))}</span>`,
    "      </li>",
  ].join("\n")).join("\n");
  const center = data.center ?? {};

  return [
    `<figure class="${chartClasses("donut", variant)}" data-qdoc-chart="donut" data-variant="${escapeAttr(variant)}" aria-label="${escapeAttr(data.ariaLabel ?? data.title ?? "Donut chart")}">`,
    '  <div class="cost-donut__layout">',
    '    <svg class="cost-donut__svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" role="img">',
    '      <g class="cost-donut__segments" transform="rotate(-90 100 100)">',
    segments,
    "      </g>",
    `      <text class="center-line center-label" x="100" y="92">${escapeHtml(center.label ?? "")}</text>`,
    `      <text class="center-line center-value" x="100" y="113">${escapeHtml(center.value ?? "")}</text>`,
    `      <text class="center-line center-unit" x="100" y="128">${escapeHtml(center.unit ?? "")}</text>`,
    "    </svg>",
    '    <ol class="cost-donut__legend">',
    legend,
    "    </ol>",
    "  </div>",
    `  <figcaption>圖：${escapeHtml(data.caption ?? data.title ?? "")}</figcaption>`,
    "</figure>",
  ].join("\n");
}

function renderLineChart(data, variant) {
  const items = requireItems(data, "line");
  const values = items.map((item) => numberValue(item.value));
  const min = numberValue(data.min ?? 0);
  const max = numberValue(data.max ?? Math.max(...values, 1));
  if (max <= min) throw new Error("qdoc-chart line data max must be greater than min");
  const ticks = readLineTicks(data, min, max);
  const points = items.map((item, index) => {
    const value = numberValue(item.value);
    return {
      item,
      x: lineX(index, items.length),
      y: lineY(value, min, max),
      value,
    };
  });
  const linePoints = points.map((point) => `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`).join(" ");
  const areaPoints = [
    linePoints,
    `${formatSvgNumber(points.at(-1).x)},${LINE_CHART_BOUNDS.plotBottom}`,
    `${formatSvgNumber(points[0].x)},${LINE_CHART_BOUNDS.plotBottom}`,
  ].join(" ");
  const gridLines = ticks.map((tick) => {
    const y = lineY(tick, min, max);
    const className = tick === min ? "grid" : "grid-soft";
    return `      <line class="${className}" x1="${LINE_CHART_BOUNDS.gridLeft}" y1="${formatSvgNumber(y)}" x2="${LINE_CHART_BOUNDS.gridRight}" y2="${formatSvgNumber(y)}" />`;
  }).join("\n");
  const axisLabels = ticks.map((tick) => {
    const y = lineY(tick, min, max) + 4;
    return `      <text class="axis-label" x="74" y="${formatSvgNumber(y)}" text-anchor="end">${escapeHtml(formatGroupedDecimal(tick))}</text>`;
  }).join("\n");
  const dots = points.map((point) => (
    `      <circle class="dot" cx="${formatSvgNumber(point.x)}" cy="${formatSvgNumber(point.y)}" r="${formatSvgNumber(data.pointRadius ?? 5)}" />`
  )).join("\n");
  const valueLabels = points.map((point) => (
    `      <text class="value-label" x="${formatSvgNumber(point.x)}" y="${formatSvgNumber(point.y - 13)}">${escapeHtml(formatLineValueLabel(point.item, data))}</text>`
  )).join("\n");
  const xLabels = points.map((point) => (
    `      <text class="x-label" x="${formatSvgNumber(point.x)}" y="240">${escapeHtml(point.item.label)}</text>`
  )).join("\n");
  const xSubLabels = points.map((point) => {
    if (typeof point.item.subLabel !== "string" || !point.item.subLabel) return "";
    return `      <text class="x-sub" x="${formatSvgNumber(point.x)}" y="258">${escapeHtml(point.item.subLabel)}</text>`;
  }).filter(Boolean).join("\n");

  return [
    `<figure class="${chartClasses("line", variant)}" data-qdoc-chart="line" data-variant="${escapeAttr(variant)}" aria-label="${escapeAttr(data.ariaLabel ?? data.title ?? "Line chart")}">`,
    `  <svg class="${escapeAttr(`${variant}__svg`)}" viewBox="0 0 ${LINE_CHART_BOUNDS.width} ${LINE_CHART_BOUNDS.height}" preserveAspectRatio="xMidYMid meet" role="img">`,
    gridLines,
    `      <text class="axis-unit" x="${LINE_CHART_BOUNDS.gridLeft}" y="48">${escapeHtml(data.axisUnit ?? data.yAxisLabel ?? "")}</text>`,
    axisLabels,
    `      <polygon class="area" points="${escapeAttr(areaPoints)}" />`,
    `      <polyline class="line" points="${escapeAttr(linePoints)}" />`,
    dots,
    valueLabels,
    xLabels,
    xSubLabels,
    "  </svg>",
    `  <figcaption>圖：${escapeHtml(data.caption ?? data.title ?? "")}</figcaption>`,
    "</figure>",
  ].filter(Boolean).join("\n");
}

function readLineTicks(data, min, max) {
  if (Array.isArray(data.ticks) && data.ticks.length > 0) {
    return data.ticks.map(numberValue);
  }
  return [max, min + ((max - min) * 2) / 3, min + (max - min) / 3, min];
}

function lineX(index, count) {
  if (count <= 1) return (LINE_CHART_BOUNDS.plotLeft + LINE_CHART_BOUNDS.plotRight) / 2;
  const progress = index / (count - 1);
  return LINE_CHART_BOUNDS.plotLeft + (LINE_CHART_BOUNDS.plotRight - LINE_CHART_BOUNDS.plotLeft) * progress;
}

function lineY(value, min, max) {
  const progress = (value - min) / (max - min);
  return LINE_CHART_BOUNDS.plotBottom - (LINE_CHART_BOUNDS.plotBottom - LINE_CHART_BOUNDS.plotTop) * progress;
}

function formatLineValueLabel(item, data) {
  if (typeof item.valueLabel === "string") return item.valueLabel;
  const prefix = data.currencyPrefix ?? data.valuePrefix ?? "";
  const unit = data.unit ? ` ${data.unit}` : "";
  return `${prefix}${formatGroupedDecimal(numberValue(item.value))}${unit}`;
}

function requiredString(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function requiredChartType(value) {
  const chartType = requiredString(value, "qdoc-chart type");
  if (chartType === "bar" || chartType === "donut" || chartType === "line") return chartType;
  throw new Error(`Unsupported qdoc-chart type: ${chartType}`);
}

function requireItems(data, type) {
  if (!Array.isArray(data?.items) || data.items.length === 0) {
    throw new Error(`qdoc-chart ${type} data must include a non-empty items array`);
  }
  return data.items;
}

function numberValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`qdoc-chart value must be numeric: ${value}`);
  return number;
}

function formatPercentValue(value) {
  return formatDecimal(Math.max(0, Math.min(100, numberValue(value))));
}

function formatDisplayValue(value, unit) {
  return `${formatDecimal(numberValue(value))}${unit}`;
}

function formatDecimal(value) {
  return Number(value.toFixed(2)).toString();
}

function formatGroupedDecimal(value) {
  const [whole, fraction] = formatDecimal(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

function formatSvgNumber(value) {
  if (Math.abs(value) < 0.005) return "0";
  return formatDecimal(value);
}

function chartClasses(type, variant) {
  return ["chart-frame", "qdoc-chart", `qdoc-chart--${type}`, variant].map(escapeAttr).join(" ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
