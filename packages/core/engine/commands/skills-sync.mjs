import { runCommand } from "./_shared.mjs";
import {
  buildSkillsSyncPlan,
  formatSkillsCommand,
  inspectProjectSkills,
  pruneRetiredFrameworkSkills,
  readProjectSkillsLock,
} from "../runtime/skills-tool.mjs";

export async function createSkillsSyncPlan(root, options = {}) {
  const lock = await readProjectSkillsLock(root);
  const active = await pruneRetiredFrameworkSkills(root, lock);
  return buildSkillsSyncPlan(active.lock, { extraSource: options.source });
}

export function formatSkillsSyncPlan(plan) {
  return plan.map(formatSkillsCommand);
}

export async function run({ root, options }) {
  const quiet = Boolean(options?.quiet);
  const lock = await readProjectSkillsLock(root);
  const retirement = await pruneRetiredFrameworkSkills(root, lock, {
    apply: !options?.dryRun,
  });
  const plan = buildSkillsSyncPlan(retirement.lock, { extraSource: options?.source });

  if (!quiet && retirement.retiredSkillNames.length > 0) {
    const verb = options?.dryRun ? "Would stop managing" : "OpenPress no longer manages";
    console.log(
      `${verb} ${retirement.retiredSkillNames.join(", ")}; local skill files were left untouched.`,
    );
    console.log("Optional local cleanup paths:");
    for (const skillName of retirement.retiredSkillNames) {
      console.log(`  - .agents/skills/${skillName}/`);
      console.log(`  - .claude/skills/${skillName}/`);
    }
  }

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
