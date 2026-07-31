import { readFile } from "node:fs/promises";
import path from "node:path";
import { diagnose } from "./doctor.mjs";
import { runCommand } from "./_shared.mjs";
import * as skillsSyncCmd from "./skills-sync.mjs";

export async function run({ root, options }) {
  const dryRun = Boolean(options?.dryRun);
  const skipSkills = Boolean(options?.noSkills);
  const skipDeps = Boolean(options?.noDeps);
  const json = Boolean(options?.json);

  // 1. Fresh diagnose (force re-check, ignore cache).
  const before = await diagnose(root, { noCache: true });

  if (!before.stale && skipSkills) {
    const message = "open-press is already up to date.";
    if (json) {
      process.stdout.write(JSON.stringify({ status: "noop", before }, null, 2) + "\n");
    } else {
      process.stdout.write(`✓ ${message}\n`);
    }
    return 0;
  }

  if (!json) {
    process.stdout.write("○ open-press upgrade\n\n");
    if (before.coreUpdateAvailable) {
      process.stdout.write(
        `  @open-press/core: ${before.coreVersion} → ${before.coreLatest}\n`,
      );
    }
    process.stdout.write("\n");
  }

  if (dryRun) {
    let skillsPlan;
    try {
      skillsPlan = skipSkills
        ? []
        : await skillsSyncCmd.createSkillsSyncPlan(root, options);
    } catch (error) {
      if (!json) throw error;
      writeJsonFailure({
        stage: "skills-plan",
        error,
        before,
      });
      return 1;
    }
    if (!json) {
      for (const command of skillsSyncCmd.formatSkillsSyncPlan(skillsPlan)) {
        process.stdout.write(`Command: ${command}\n`);
      }
      process.stdout.write("dry run — nothing changed.\n");
      process.stdout.write("  re-run: open-press upgrade .   (without --dry-run)\n");
    } else {
      process.stdout.write(
        JSON.stringify(
          {
            status: "dry-run",
            before,
            skillsPlan: skillsSyncCmd.formatSkillsSyncPlan(skillsPlan),
          },
          null,
          2,
        ) + "\n",
      );
    }
    return 0;
  }

  // 2. Refresh framework dep (only when workspace declares @open-press/core).
  if (!skipDeps && (await hasCoreDep(root))) {
    if (!json) process.stdout.write("▸ updating @open-press/core via npm…\n");
    const code = runCommand("npm", ["update", "@open-press/core"], root, {
      stdio: json ? "ignore" : "inherit",
    });
    if (code !== 0) {
      if (!json) process.stdout.write("  ⚠ npm update returned non-zero; continuing\n");
    }
  }

  // 3. Refresh exact locked skills and ensure the complete framework bundle.
  if (!skipSkills) {
    if (!json) process.stdout.write("▸ refreshing skills from skills-lock.json…\n");
    let code;
    try {
      code = await skillsSyncCmd.run({
        root,
        options: { ...options, quiet: json },
      });
    } catch (error) {
      if (!json) throw error;
      const after = await diagnose(root, { noCache: true });
      writeJsonFailure({
        stage: "skills",
        error,
        before,
        after,
      });
      return 1;
    }
    if (code !== 0) {
      if (json) {
        const after = await diagnose(root, { noCache: true });
        process.stdout.write(
          JSON.stringify(
            { status: "failed", stage: "skills", exitCode: code, before, after },
            null,
            2,
          ) + "\n",
        );
      }
      return code;
    }
  }

  // 4. Re-diagnose to confirm the move.
  const after = await diagnose(root, { noCache: true });
  const unresolvedSkills =
    after.skillsMissing.length > 0 ||
    after.skillsLinkIssues.length > 0 ||
    Boolean(after.skillsLockIssue);
  const incomplete =
    (!skipDeps && after.coreUpdateAvailable) ||
    (!skipSkills && unresolvedSkills);
  if (incomplete) {
    if (json) {
      process.stdout.write(JSON.stringify({ status: "incomplete", before, after }, null, 2) + "\n");
    } else {
      process.stderr.write(
        "\nUpgrade finished running commands, but doctor still reports unresolved issues.\n",
      );
    }
    return 1;
  }

  if (json) {
    process.stdout.write(
      JSON.stringify(
        { status: "applied", before, after },
        null,
        2,
      ) + "\n",
    );
    return 0;
  }

  process.stdout.write("\n✓ upgrade applied.\n");
  process.stdout.write("\nVerify with:\n  npm run build\n\n");
  return 0;
}

function writeJsonFailure({ stage, error, before, after }) {
  process.stdout.write(
    JSON.stringify(
      {
        status: "failed",
        stage,
        error: error instanceof Error ? error.message : String(error),
        before,
        ...(after ? { after } : {}),
      },
      null,
      2,
    ) + "\n",
  );
}

async function hasCoreDep(root) {
  try {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    return Boolean(pkg.dependencies?.["@open-press/core"] || pkg.devDependencies?.["@open-press/core"]);
  } catch {
    return false;
  }
}
