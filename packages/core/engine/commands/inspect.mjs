import { inspectWorkspace } from "../runtime/inspection.mjs";
import { inspectionPrintUrl } from "../runtime/inspection.mjs";
import { exitCodeForIssueReport } from "../runtime/issue-report.mjs";
import { formatOpenPressCommand, formatViteCommand } from "./_shared.mjs";

export async function run({ root, config, options, recurse }) {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? "5186";
  const url = inspectionPrintUrl(host, port, options.press ?? "");

  if (options.dryRun) {
    if (!options.noBuild) {
      console.log(`Command: ${formatOpenPressCommand(["render", ".", "--renderer", "react"])}`);
    }
    console.log(`Command: ${formatViteCommand(root, ["preview", "--host", host, "--port", port, "--strictPort"])}`);
    console.log(`Chrome inspection URL: ${url}`);
    return 0;
  }

  const report = await inspectWorkspace({ root, config, options, recurse });
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return exitCodeForIssueReport(report);
  }

  if (report.ok) {
    console.log(report.format());
    console.log(`Checked: ${report.checked.join(", ")}`);
    if (report.summary) {
      console.log(`Summary: ${JSON.stringify(report.summary)}`);
    }
    return 0;
  }

  console.log(report.format());
  return exitCodeForIssueReport(report);
}
