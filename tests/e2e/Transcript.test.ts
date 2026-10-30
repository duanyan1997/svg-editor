import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { PassThrough } from "node:stream";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/cli/App.js";
import { BufferOutput } from "../../src/commands/Output.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-editor-e2e-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** 把命令脚本灌进真实 REPL（App 装配，含分词/分发/输出全链路） */
async function runSession(script: string): Promise<string[]> {
  const input = new PassThrough();
  const output = new BufferOutput();
  const { repl } = createApp(input as unknown as NodeJS.ReadStream, output);
  const done = repl.run();
  input.end(script);
  await done;
  return output.lines;
}

const OTHER_SVG = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
  '  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>',
  '  <text id="t1" x="10" y="290">imported</text>',
  '  <circle id="c1" cx="50" cy="50" r="10"/>',
  "  <g id=\"g1\">",
  '    <rect id="r2" x="0" y="0" width="10" height="10"/>',
  '    <circle id="c2" cx="5" cy="5" r="2"/>',
  "  </g>",
  '  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>',
  "</svg>",
].join("\n");

describe("端到端：§6 典型会话", () => {
  it("完整 transcript：创建/分组/move/set/undo/redo/save/读外部文件", async () => {
    const demo = path.join(tmpDir, "demo.svg");
    const other = path.join(tmpDir, "other.svg");
    fs.writeFileSync(other, OTHER_SVG, "utf8");

    const lines = await runSession(
      [
        "init 800 600",
        "create rect bg 0 0 800 600 #ffffff",
        'create text title 20 40 "My Diagram"',
        "create circle c1 100 100 20 red",
        "create rect box 200 80 60 60 #3366ff",
        "",
        "# 分组注释行应被忽略",
        "group markers c1 box",
        "tree",
        "move c1 30 0",
        "undo",
        "redo",
        'set title text "My Diagram v2"',
        "undo",
        `save ${demo}`,
        "undo",
        `read ${other}`,
        "tree",
      ].join("\n"),
    );

    expect(lines).toEqual([
      "svg-editor 0.1 — type 'help' for commands",
      "canvas 800x600 created",
      "rect#bg created",
      "text#title created",
      "circle#c1 created",
      "rect#box created",
      "g#markers created with 2 children",
      "svg (800x600)",
      "├── rect#bg     x=0 y=0 w=800 h=600 fill=#ffffff",
      '├── text#title  (20,40) "My Diagram"',
      "└── g#markers",
      "    ├── circle#c1  cx=100 cy=100 r=20 fill=red",
      "    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff",
      "circle#c1 moved to (130,100)",
      "circle#c1 moved back to (100,100)",
      "circle#c1 moved to (130,100)",
      'text#title updated: text="My Diagram v2"',
      'text#title updated: text="My Diagram"',
      `saved to ${demo} (5 elements)`,
      "error: undo not allowed after io command",
      "warning: assigned id rect1 to unnamed <rect>",
      `read ${other} (7 elements)`,
      "svg (400x300)",
      "├── rect#rect1  x=0 y=0 w=400 h=300 fill=#ffffff",
      '├── text#t1     (10,290) "imported"',
      "├── circle#c1   cx=50 cy=50 r=10",
      "├── g#g1",
      "│   ├── rect#r2    x=0 y=0 w=10 h=10",
      "│   └── circle#c2  cx=5 cy=5 r=2",
      "└── ellipse#e1  cx=1 cy=2 rx=3 ry=4",
    ]);
  });
});

describe("端到端：§6.1 两节点流程图（in 子句自顶向下）", () => {
  it("层级在创建时成立，容器整体平移", async () => {
    const flowchart = path.join(tmpDir, "flowchart.svg");
    const lines = await runSession(
      [
        "init 800 600",
        "create g flowchart",
        "create g node1 in flowchart",
        "create rect start 120 100 160 60 #4a90d9 in node1",
        'create text start-label 155 135 "开始" in node1',
        "create g node2 in flowchart",
        "create rect process 520 100 160 60 #f5a623 in node2",
        'create text process-label 545 135 "处理数据" in node2',
        "create line arrow1 280 130 520 130 black in flowchart",
        "tree",
        "move node2 0 100",
        "undo",
        'set process-label text "处理数据 v2"',
        `save ${flowchart}`,
      ].join("\n"),
    );

    expect(lines).toEqual([
      "svg-editor 0.1 — type 'help' for commands",
      "canvas 800x600 created",
      "g#flowchart created",
      "g#node1 created in g#flowchart",
      "rect#start created in g#node1",
      'text#start-label created in g#node1',
      "g#node2 created in g#flowchart",
      "rect#process created in g#node2",
      'text#process-label created in g#node2',
      "line#arrow1 created in g#flowchart",
      "svg (800x600)",
      "└── g#flowchart",
      "    ├── g#node1",
      "    │   ├── rect#start        x=120 y=100 w=160 h=60 fill=#4a90d9",
      "    │   └── text#start-label  (155,135) \"开始\"",
      "    ├── g#node2",
      "    │   ├── rect#process        x=520 y=100 w=160 h=60 fill=#f5a623",
      "    │   └── text#process-label  (545,135) \"处理数据\"",
      "    └── line#arrow1  (280,130) -> (520,130) stroke=black",
      "g#node2 moved by (0,100)",
      "g#node2 moved back by (0,-100)",
      'text#process-label updated: text="处理数据 v2"',
      `saved to ${flowchart} (8 elements)`,
    ]);
  });
});

describe("端到端：save→read round-trip 与错误路径", () => {
  it("保存后读回，树结构逐行一致（含中文文本）", async () => {
    const file = path.join(tmpDir, "rt.svg");
    const lines = await runSession(
      [
        "init 800 600",
        "create g flowchart",
        "create rect start 120 100 160 60 #4a90d9 in flowchart",
        'create text start-label 155 135 "开始" in flowchart',
        "tree",
        `save ${file}`,
        `read ${file}`,
        "tree",
      ].join("\n"),
    );

    const firstTree = lines.slice(5, 9);
    const secondTree = lines.slice(11, 15);
    expect(firstTree).toEqual(secondTree);
    expect(lines.filter((l) => l.startsWith("warning")).length).toBe(0);
  });

  it("错误路径与空行/注释：一行一条错误，命令失败不改状态", async () => {
    const lines = await runSession(
      [
        "# 只有注释和空行",
        "",
        "frobnicate 1 2",
        "canvas",
        "tree",
        "create rect r1 0 0 10 10",
        "canvas 1",
        "init 800 600",
        "delete ghost",
        "create rect r1 0 0 10 10",
        "scale r1 0",
        "canvas 800 600",
      ].join("\n"),
    );

    expect(lines).toEqual([
      "svg-editor 0.1 — type 'help' for commands",
      "error: unknown command: frobnicate",
      "error: no document. use 'init' or 'read' first",
      "error: no document. use 'init' or 'read' first",
      "error: no document. use 'init' or 'read' first",
      "error: no document. use 'init' or 'read' first",
      "canvas 800x600 created",
      "error: no such shape: ghost",
      "rect#r1 created",
      "error: scale factor must be positive",
      "canvas resized to 800x600",
    ]);
  });
});
