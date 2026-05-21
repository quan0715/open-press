import { validateWorkspace } from "../validation.mjs";
import { exitCodeForIssueReport } from "../issue-report.mjs";

export async function run({ root, options }) {
  const report = await validateWorkspace(root);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return exitCodeForIssueReport(report);
  }
  if (report.ok) {
    console.log("OpenPress validation OK");
    console.log(`Checked: ${report.checked.join(", ")}`);
    return 0;
  }
  console.log(report.format());
  return 1;
}
