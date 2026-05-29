import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Test scaffolding: create a temp workspace dir, hand it to a callback,
// and recursively delete it afterwards.
//
// rmWithRetry retries ENOTEMPTY because vite-ssr and similar tools
// flush dependency caches asynchronously after the test thinks it's
// done. A single rm sometimes races against that flush on Linux CI
// runners; bare `force: true` doesn't help because the race is on
// the directory becoming empty, not on permissions.
export async function withTempWorkspace(prefix, fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
  }
}

export async function rmWithRetry(dir, attempts = 5) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 60 });
      return;
    } catch (error) {
      lastError = error;
      if (error?.code !== "ENOTEMPTY" && error?.code !== "EBUSY") throw error;
      await new Promise((resolve) => setTimeout(resolve, 80 * (i + 1)));
    }
  }
  throw lastError;
}
