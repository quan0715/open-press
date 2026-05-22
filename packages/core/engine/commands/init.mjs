import { initWorkspace, listStylePackSkills } from "../init.mjs";
import { formatDisplayPath, parseInitOptions } from "./_shared.mjs";

export const needsWorkspace = false;

export async function run({ argv }) {
  const options = parseInitOptions(argv);
  if (!options.target) {
    console.error("openpress init: target path is required");
    console.error("Usage: openpress init <target> [--skill <name>] [--force]");
    const available = await listStylePackSkills();
    if (available.length) console.error(`Style packs available: ${available.join(", ")}`);
    return 1;
  }
  const result = await initWorkspace(options);
  const displayPath = formatDisplayPath(result.targetPath);
  console.log(`OpenPress init: created ${displayPath} from style pack "${result.skill}".`);
  console.log("Next steps:");
  console.log(`  cd ${displayPath}`);
  console.log("  # 填入 openpress.config.mjs 的 title / subtitle / organization");
  console.log("  # 改 document/index.tsx 與 document/chapters/**/*.mdx 為實際內容");
  console.log("  node engine/cli.mjs validate");
  return 0;
}
