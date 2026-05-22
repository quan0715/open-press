import { inspectWorkspace } from "../inspection.mjs";
import { exitCodeForIssueReport } from "../issue-report.mjs";

export async function run({ root, config, options, recurse }) {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? "5186";
  const url = `http://${host}:${port}/?print=1`;

  if (options.dryRun) {
    if (!options.noBuild) {
      console.log("Command: node engine/cli.mjs render . --renderer react");
    }
    console.log(`Command: node engine/static-server.mjs ${config.outputDir} --host ${host} --port ${port} --workspace .`);
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
