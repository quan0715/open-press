import { validateWorkspace } from "../validation.mjs";

export async function run({ root }) {
  const report = await validateWorkspace(root);
  if (report.ok) {
    console.log("QDoc validation OK");
    console.log(`Checked: ${report.checked.join(", ")}`);
    return 0;
  }
  console.log(report.format());
  return 1;
}
