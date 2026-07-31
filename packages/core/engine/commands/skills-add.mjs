import { runCommand } from "./_shared.mjs";
import {
  createOptionalFrameworkSkillAddStep,
  formatSkillsCommand,
  inspectProjectSkills,
  OPTIONAL_FRAMEWORK_SKILLS,
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
    requiredSkills: [addition.skillName],
  });
  const issues = [
    ...(verification.skillsLockIssue ? [verification.skillsLockIssue] : []),
    ...verification.skillsLinkIssues,
  ];
  if (!verification.skillsTracked.includes(addition.skillName)) {
    issues.push(`${addition.skillName}: missing skills-lock.json entry`);
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
