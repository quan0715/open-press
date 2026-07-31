import { runCommand } from "./_shared.mjs";
import {
  createOptionalFrameworkSkillAddStep,
  formatSkillsCommand,
  inspectProjectSkills,
  isFrameworkSource,
  OPTIONAL_FRAMEWORK_SKILLS,
  readProjectSkillsLock,
} from "../runtime/skills-tool.mjs";

export async function run({ root, options }) {
  const addition = createOptionalFrameworkSkillAddStep(options?.skillAlias);
  if (!addition) {
    process.stderr.write(
      `Unknown optional skill: ${options?.skillAlias ?? "(missing)"}. ` +
      `Supported: ${Object.keys(OPTIONAL_FRAMEWORK_SKILLS).join(", ")}\n`,
    );
    return 2;
  }

  if (options?.dryRun) {
    console.log(`Command: ${formatSkillsCommand(addition.step)}`);
    return 0;
  }

  console.log(`${addition.step.label}…`);
  const code = runCommand("npx", addition.step.args, root);
  if (code !== 0) return code;

  const verification = await inspectProjectSkills(root, {
    includeTrackedSkills: false,
    requireRouter: false,
    requiredSkills: [addition.skillName],
  });
  const issues = [
    ...(verification.skillsLockIssue ? [verification.skillsLockIssue] : []),
    ...verification.skillsLinkIssues,
  ];
  let targetEntry = null;
  if (!verification.skillsLockIssue) {
    const lock = await readProjectSkillsLock(root);
    targetEntry = lock?.skills?.[addition.skillName] ?? null;
  }
  if (!targetEntry) {
    issues.push(`${addition.skillName}: missing skills-lock.json entry`);
  } else if (!isFrameworkSource(targetEntry.sourceUrl ?? targetEntry.source)) {
    issues.push(
      `${addition.skillName}: not locked to quan0715/open-press`,
    );
  }
  if (issues.length > 0) {
    process.stderr.write(
      `Optional skill install verification failed:\n` +
      `${issues.map((issue) => `  - ${issue}`).join("\n")}\n`,
    );
    return 1;
  }

  console.log(`✓ Installed ${addition.skillName}`);
  return 0;
}
