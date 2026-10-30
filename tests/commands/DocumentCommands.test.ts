import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CanvasCommand } from "../../src/commands/CanvasCommand.js";
import { Editor } from "../../src/commands/Editor.js";
import { InitCommand } from "../../src/commands/InitCommand.js";
import { BufferOutput } from "../../src/commands/Output.js";
import { ReadCommand } from "../../src/commands/ReadCommand.js";
import { SaveCommand } from "../../src/commands/SaveCommand.js";
import { createDefaultShapeFactory } from "../../src/factory/ShapeFactory.js";
import { SvgReader } from "../../src/io/SvgReader.js";
import { SvgWriter } from "../../src/io/SvgWriter.js";
import { SvgError } from "../../src/model/SvgError.js";

let tmpDir: string;
let ctx: Editor;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-editor-test-"));
  const factory = createDefaultShapeFactory();
  ctx = new Editor(factory, new BufferOutput(), new SvgReader(factory), new SvgWriter());
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function output(): string[] {
  return (ctx.output as BufferOutput).lines;
}

describe("init", () => {
  it("默认 800x600", () => {
    new InitCommand().execute([], ctx);
    expect(ctx.document?.width).toBe(800);
    expect(output()).toEqual(["canvas 800x600 created"]);
  });

  it("显式尺寸", () => {
    new InitCommand().execute(["400", "300"], ctx);
    expect(ctx.document?.width).toBe(400);
    expect(output()).toEqual(["canvas 400x300 created"]);
  });

  it("非正尺寸报错", () => {
    expect(() => new InitCommand().execute(["0", "300"], ctx)).toThrowError(
      "canvas size must be positive",
    );
    expect(() => new InitCommand().execute(["a", "300"], ctx)).toThrowError("invalid number: a");
  });

  it("参数个数错误报 usage", () => {
    expect(() => new InitCommand().execute(["400"], ctx)).toThrowError("usage: init [w] [h]");
  });
});

describe("canvas", () => {
  it("无参数显示尺寸；改尺寸回显并锁定 undo", () => {
    new InitCommand().execute([], ctx);
    new CanvasCommand().execute([], ctx);
    expect(output()).toEqual(["canvas 800x600 created", "canvas 800x600"]);

    new CanvasCommand().execute(["1024", "768"], ctx);
    expect(ctx.document?.width).toBe(1024);
    expect(output().at(-1)).toBe("canvas resized to 1024x768");
    expect(() => ctx.history.undo(ctx.document!)).toThrowError(
      "undo not allowed after io command",
    );
  });

  it("canvas 显示尺寸本身不产生新动作（undo 仍处于 init 后的 io 锁定态）", () => {
    new InitCommand().execute([], ctx);
    new CanvasCommand().execute([], ctx);
    // init 是文档类命令：锁保持到下一条编辑命令；canvas 无参数显示不改变也不解除它
    expect(() => ctx.history.undo(ctx.document!)).toThrowError(
      "undo not allowed after io command",
    );
  });

  it("无文档报错", () => {
    expect(() => new CanvasCommand().execute([], ctx)).toThrowError(
      "no document. use 'init' or 'read' first",
    );
  });
});

describe("save / read", () => {
  it("save 写文件并回显元素计数", () => {
    new InitCommand().execute([], ctx);
    const file = path.join(tmpDir, "demo.svg");
    new SaveCommand().execute([file], ctx);
    expect(output().at(-1)).toBe(`saved to ${file} (0 elements)`);
    expect(fs.readFileSync(file, "utf8")).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  });

  it("save 无路径且未读入时报错", () => {
    new InitCommand().execute([], ctx);
    expect(() => new SaveCommand().execute([], ctx)).toThrowError("no save path");
  });

  it("read 缺失文件报错且文档不变", () => {
    new InitCommand().execute([], ctx);
    expect(() => new ReadCommand().execute(["nope.svg"], ctx)).toThrowError(
      "cannot read file: nope.svg",
    );
    expect(ctx.document?.width).toBe(800);
  });

  it("save 无参数落到读入路径；read 换文档", () => {
    const file = path.join(tmpDir, "a.svg");
    fs.writeFileSync(
      file,
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
        '  <circle id="c1" cx="50" cy="50" r="10"/>',
        "</svg>",
      ].join("\n"),
      "utf8",
    );

    new ReadCommand().execute([file], ctx);
    expect(ctx.document?.width).toBe(400);
    expect(output().at(-1)).toBe(`read ${file} (1 elements)`);

    new SaveCommand().execute([], ctx);
    expect(output().at(-1)).toBe(`saved to ${file} (1 elements)`);
    expect(ctx.document?.sourcePath).toBe(file);
  });
});
