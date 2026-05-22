import { check, parseArgsAsCheckConfig } from "@astrojs/check";

const config = parseArgsAsCheckConfig(process.argv);
const hasErrors = await check(config);

process.exit(typeof hasErrors === "boolean" && hasErrors ? 1 : 0);
