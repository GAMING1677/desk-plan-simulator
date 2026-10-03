import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const testJobs = [
  ["node_modules/vitest/vitest.mjs", "run"],
  ["--test", "features/simulator/browser-tools/create-layout-tools.test.mjs"],
  ["node_modules/@playwright/test/cli.js", "test"],
];
export function runTests(
  run = (args) => spawnSync(process.execPath, args, { stdio: "inherit" }),
) {
  for (const args of testJobs) {
    const result = run(args);
    if (result.error) {
      console.error(result.error.message);
      return 1;
    }
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = runTests();
