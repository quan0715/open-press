export type QDocChartType = "bar" | "donut" | "line";

export function inferChartType(data: unknown): QDocChartType;

export function renderChartFigure(options: {
  type?: string | null;
  data: unknown;
  variant?: string | null;
}): string;
