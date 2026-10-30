import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

/** 真实进程边界：npm run cli 的入口（tsx 加载 + 管道输入）能启动并处理命令 */
describe("cli 入口（真实子进程）", () => {
  it("管道输入下启动、执行命令、干净退出", () => {
    const result = spawnSync("npx", ["tsx", "src/cli/main.ts"], {
      input: "init 400 200\ncanvas\nunknown-cmd\n",
      encoding: "utf8",
      shell: true,
      timeout: 120000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("svg-editor 0.1 — type 'help' for commands");
    expect(result.stdout).toContain("canvas 400x200 created");
    expect(result.stdout).toContain("canvas 400x200");
    expect(result.stdout).toContain("error: unknown command: unknown-cmd");
  });
});
