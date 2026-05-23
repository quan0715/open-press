export function createIssue({ level = "warning", code, message, path = null, detail = undefined }) {
  return {
    level,
    code,
    message,
    ...(path ? { path } : {}),
    ...(detail !== undefined ? { detail } : {}),
  };
}

export function createIssueReport({ kind, checked = [], issues = [], summary = undefined, okMessage = undefined }) {
  const report = {
    kind,
    ok: issues.every((issue) => issue.level !== "error"),
    checked,
    issues,
    ...(summary !== undefined ? { summary } : {}),
  };
  return {
    ...report,
    format() {
      return formatIssueReport(report, { okMessage });
    },
  };
}

export function exitCodeForIssueReport(report) {
  return report.ok ? 0 : 1;
}

export function formatIssueReport(report, { okMessage } = {}) {
  if (report.issues.length === 0) return okMessage ?? `${capitalize(report.kind)} OK`;
  return report.issues.map(formatIssue).join("\n");
}

function formatIssue(issue) {
  const suffix = issue.path ? ` (${issue.path})` : "";
  return `[${issue.level}] ${issue.code}: ${issue.message}${suffix}`;
}

function capitalize(value) {
  const text = String(value ?? "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "Report";
}
