import { runCommand } from "./_shared.mjs";
import {
  buildSkillsSyncPlan,
  formatSkillsCommand,
  inspectProjectSkills,
  readProjectSkillsLock,
} from "../runtime/skills-tool.mjs";

export async function createSkillsSyncPlan(root, options = {}) {
  const lock = await readProjectSkillsLock(root);
  return buildSkillsSyncPlan(lock, { extraSource: options.source });
}

export function formatSkillsSyncPlan(plan) {
  return plan.map(formatSkillsCommand);
}

export async function run({ root, options }) {
  const plan = await createSkillsSyncPlan(root, options);
  const quiet = Boolean(options?.quiet);

  if (options?.dryRun) {
    if (!quiet) {
      for (const command of formatSkillsSyncPlan(plan)) console.log(`Command: ${command}`);
    }
    return 0;
  }

  for (const step of plan) {
    if (!quiet) console.log(`${step.label}…`);
    const code = runCommand("npx", step.args, root, {
      stdio: quiet ? "ignore" : "inherit",
    });
    if (code !== 0) return code;
  }

  const verification = await inspectProjectSkills(root, {
    requireFrameworkBundle: true,
  });
  const issues = [
    ...(verification.skillsLockIssue ? [verification.skillsLockIssue] : []),
    ...verification.skillsLinkIssues,
  ];
  if (issues.length > 0) {
    process.stderr.write(
      `Skill sync verification failed:\n${issues.map((issue) => `  - ${issue}`).join("\n")}\n`,
    );
    return 1;
  }

  if (!quiet) console.log("✓ Skills synced");
  return 0;
}
