import { fileURLToPath } from "node:url";

process.env.OPENPRESS_WORKSPACE_ROOT ??= fileURLToPath(new URL("./", import.meta.url));

const coreViteConfig = await import("./packages/core/vite.config.ts");

export default coreViteConfig.default;
