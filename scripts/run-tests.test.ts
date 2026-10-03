// @vitest-environment node
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
export const subject = "scripts/run-tests.mjs";
spec(
  "RUN-01",
  "全テストの実行",
  "単体・既存ツール・ブラウザが成功",
  "3群を順に実行し終了コード0",
  async () => {
    const path = "./run-tests.mjs";
    const { runTests, testJobs } = await import(path);
    const run = vi.fn().mockReturnValue({ status: 0 });
    expect(runTests(run)).toBe(0);
    expect(run.mock.calls.map((c) => c[0])).toEqual(testJobs);
  },
);
spec(
  "RUN-02",
  "失敗の伝達",
  "2群目が失敗、または起動失敗",
  "以降を実行せず非0終了",
  async () => {
    const path = "./run-tests.mjs";
    const { runTests } = await import(path);
    const run = vi
      .fn()
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: 2 });
    expect(runTests(run)).toBe(2);
    expect(run).toHaveBeenCalledTimes(2);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(runTests(() => ({ error: Error("spawn"), status: null }))).toBe(1);
  },
);
