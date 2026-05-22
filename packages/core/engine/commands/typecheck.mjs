import { runCommand } from "./_shared.mjs";

export async function run({ root }) {
  return runCommand("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], root);
}
