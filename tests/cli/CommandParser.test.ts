import { describe, expect, it } from "vitest";

import { CommandParser } from "../../src/cli/CommandParser.js";

describe("CommandParser", () => {
  it("按空白分词", () => {
    expect(CommandParser.parse("create rect r1 0 0 10 20")).toEqual([
      "create",
      "rect",
      "r1",
      "0",
      "0",
      "10",
      "20",
    ]);
  });

  it("连续空白与 tab 等价", () => {
    expect(CommandParser.parse("  move   r1\t30  0 ")).toEqual(["move", "r1", "30", "0"]);
  });

  it("双引号包裹的内容为一个 token 且剥除引号", () => {
    expect(CommandParser.parse('create text t1 20 40 "My Diagram v2"')).toEqual([
      "create",
      "text",
      "t1",
      "20",
      "40",
      "My Diagram v2",
    ]);
  });

  it("空内容引号保留空 token", () => {
    expect(CommandParser.parse('set t1 text ""')).toEqual(["set", "t1", "text", ""]);
  });

  it("未闭合引号视为到行尾", () => {
    expect(CommandParser.parse('create text t1 1 2 "open')).toEqual([
      "create",
      "text",
      "t1",
      "1",
      "2",
      "open",
    ]);
  });
});
