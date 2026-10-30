import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * 架构依赖规则的自动化检查（doc/README.md §3）：
 * 静态扫描 src/ 全部 import 语句，任何违反依赖方向的写法直接挂测试。
 * 组装根（cli/App.ts）与入口（cli/main.ts）是依赖注入的组合点，豁免。
 */

const SRC_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

const MODULES = ["model", "factory", "history", "io", "commands", "cli"] as const;
type ModuleName = (typeof MODULES)[number];

/** 各模块允许依赖的模块（不含模块内部）；依据 doc/README.md §3 依赖方向表（修订版：io→factory） */
const ALLOWED: Record<ModuleName, readonly ModuleName[]> = {
  model: [],
  factory: ["model"],
  history: ["model"],
  io: ["model", "factory"],
  commands: ["model", "history", "factory", "io"],
  cli: ["commands"],
};

/** 组合根豁免：唯一允许认识全部模块的地方 */
const COMPOSITION_ROOT = new Set(["App.ts", "main.ts"]);

function listTsFiles(dir: string): string[] {
  const entries: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) entries.push(...listTsFiles(full));
    else if (name.endsWith(".ts")) entries.push(full);
  }
  return entries;
}

function moduleOf(file: string): ModuleName {
  const rel = path.relative(SRC_ROOT, file).replaceAll("\\", "/");
  const top = rel.split("/")[0] as ModuleName;
  expect(MODULES).toContain(top);
  return top;
}

function importsOf(file: string): string[] {
  const text = fs.readFileSync(file, "utf8");
  const pattern = /(?:from|import)\s+"([^"]+)"/g;
  const found: string[] = [];
  for (const match of text.matchAll(pattern)) found.push(match[1]!);
  return found;
}

/** 相对导入 → 目标模块名；外部包（node:/npm 包）返回 null */
function targetModule(fromFile: string, specifier: string): ModuleName | null {
  if (!specifier.startsWith(".")) return null;
  const resolved = path.resolve(path.dirname(fromFile), specifier);
  const rel = path.relative(SRC_ROOT, resolved).replaceAll("\\", "/");
  const top = rel.split("/")[0] ?? "";
  return (MODULES as readonly string[]).includes(top) ? (top as ModuleName) : null;
}

describe("架构依赖规则（doc/README.md §3 的机器可查版本）", () => {
  const files = listTsFiles(SRC_ROOT);

  it("src 下确实存在六个模块（防扫描失效）", () => {
    const seen = new Set(files.map(moduleOf));
    expect([...seen].sort()).toEqual([...MODULES].sort());
  });

  it("每个模块的 import 均不越出允许的依赖集合", () => {
    const violations: string[] = [];
    for (const file of files) {
      const owner = moduleOf(file);
      for (const specifier of importsOf(file)) {
        const target = targetModule(file, specifier);
        if (target === null || target === owner) continue;
        const isCompositionRoot =
          owner === "cli" && COMPOSITION_ROOT.has(path.basename(file));
        const allowed = isCompositionRoot ? MODULES : ALLOWED[owner];
        if (!allowed.includes(target)) {
          violations.push(`${path.relative(SRC_ROOT, file)} -> ${target} (via "${specifier}")`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("没有模块依赖 cli（终端只是命令的一种触发通道）", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (moduleOf(file) === "cli") continue;
      for (const specifier of importsOf(file)) {
        if (targetModule(file, specifier) === "cli") {
          offenders.push(`${path.relative(SRC_ROOT, file)} -> cli`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
