import { describe, expect, it } from "vitest";

import { CreateCommand } from "../../src/commands/CreateCommand.js";
import { DeleteCommand } from "../../src/commands/DeleteCommand.js";
import { Editor } from "../../src/commands/Editor.js";
import { InitCommand } from "../../src/commands/InitCommand.js";
import { MoveCommand } from "../../src/commands/MoveCommand.js";
import { BufferOutput } from "../../src/commands/Output.js";
import { RedoCommand } from "../../src/commands/RedoCommand.js";
import { ScaleCommand } from "../../src/commands/ScaleCommand.js";
import { SetCommand } from "../../src/commands/SetCommand.js";
import { UndoCommand } from "../../src/commands/UndoCommand.js";
import { createDefaultShapeFactory } from "../../src/factory/ShapeFactory.js";
import { SvgReader } from "../../src/io/SvgReader.js";
import { SvgWriter } from "../../src/io/SvgWriter.js";
import { Group } from "../../src/model/Group.js";

function newEditor(): Editor {
  const factory = createDefaultShapeFactory();
  return new Editor(factory, new BufferOutput(), new SvgReader(factory), new SvgWriter());
}

function run(ctx: Editor, command: { execute: (args: string[], ctx: Editor) => void }, args: string[]): void {
  command.execute(args, ctx);
}

describe("create", () => {
  const create = new CreateCommand();

  it("创建图形并回显", () => {
    const ctx = newEditor();
    run(ctx, new InitCommand(), []);
    run(ctx, create, ["rect", "r1", "10", "20", "100", "50", "#eee"]);
    expect(ctx.output).toBeInstanceOf(BufferOutput);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("rect#r1 created");
    expect(ctx.document?.findById("r1")?.geometrySummary()).toBe("x=10 y=20 w=100 h=50");
  });

  it("in 子句挂进容器", () => {
    const ctx = newEditor();
    run(ctx, new InitCommand(), []);
    run(ctx, create, ["g", "node1"]);
    run(ctx, create, ["rect", "start", "120", "100", "160", "60", "#4a90d9", "in", "node1"]);
    const lines = (ctx.output as BufferOutput).lines;
    expect(lines.at(-1)).toBe("rect#start created in g#node1");
    expect(ctx.document?.findById("start")?.parent).toBe(ctx.document?.findById("node1"));
  });

  it("in 目标不存在 / 不是容器", () => {
    const ctx = newEditor();
    run(ctx, new InitCommand(), []);
    run(ctx, create, ["rect", "r1", "0", "0", "1", "1"]);
    expect(() => run(ctx, create, ["rect", "r2", "0", "0", "1", "1", "in", "node9"])).toThrowError(
      "no such container: node9",
    );
    expect(() => run(ctx, create, ["rect", "r2", "0", "0", "1", "1", "in", "r1"])).toThrowError(
      "not a container: r1",
    );
  });

  it("未注册类型报插件语义错误", () => {
    const ctx = newEditor();
    run(ctx, new InitCommand(), []);
    expect(() => run(ctx, create, ["box", "b1", "0", "0", "10", "10"])).toThrowError(
      "unknown shape type: box (is the plugin loaded?)",
    );
  });

  it("重复 id 报错且不改变状态", () => {
    const ctx = newEditor();
    run(ctx, new InitCommand(), []);
    run(ctx, create, ["rect", "r1", "0", "0", "1", "1"]);
    expect(() => run(ctx, create, ["rect", "r1", "2", "2", "3", "3"])).toThrowError(
      "id already exists: r1",
    );
    expect(ctx.document?.findById("r1")?.geometrySummary()).toBe("x=0 y=0 w=1 h=1");
    expect(ctx.document?.elementCount()).toBe(1);
  });
});

describe("move", () => {
  const init = new InitCommand();
  const create = new CreateCommand();
  const move = new MoveCommand();
  const undo = new UndoCommand();
  const redo = new RedoCommand();

  it("叶子回显落点，容器回显增量", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["circle", "c1", "100", "100", "20"]);
    run(ctx, create, ["g", "node2"]);
    run(ctx, create, ["rect", "r1", "0", "0", "10", "10", "in", "node2"]);

    run(ctx, move, ["c1", "30", "0"]);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("circle#c1 moved to (130,100)");

    run(ctx, move, ["node2", "0", "100"]);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("g#node2 moved by (0,100)");
    expect(ctx.document?.findById("r1")?.anchor()).toEqual({ x: 0, y: 100 });
  });

  it("undo/redo 回显 moved back", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["circle", "c1", "100", "100", "20"]);
    run(ctx, move, ["c1", "30", "0"]);
    run(ctx, undo, []);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("circle#c1 moved back to (100,100)");
    expect(ctx.document?.findById("c1")?.anchor()).toEqual({ x: 100, y: 100 });

    run(ctx, redo, []);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("circle#c1 moved to (130,100)");
  });

  it("负增量格式化", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["g", "g1"]);
    run(ctx, move, ["g1", "0", "-100"]);
    run(ctx, undo, []);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("g#g1 moved back by (0,100)");
  });
});

describe("scale", () => {
  const init = new InitCommand();
  const create = new CreateCommand();

  it("非正因子报错且状态不变", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["circle", "c1", "100", "100", "20"]);
    for (const factor of ["0", "-2"]) {
      expect(() => run(ctx, new ScaleCommand(), ["c1", factor])).toThrowError(
        "scale factor must be positive",
      );
    }
    expect(ctx.document?.findById("c1")?.geometrySummary()).toBe("cx=100 cy=100 r=20");
  });

  it("缩放同乘位置与尺寸，undo 还原", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["circle", "c1", "100", "100", "20"]);
    run(ctx, new ScaleCommand(), ["c1", "0.5"]);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("circle#c1 scaled by 0.5");
    expect(ctx.document?.findById("c1")?.geometrySummary()).toBe("cx=50 cy=50 r=10");
    run(ctx, new UndoCommand(), []);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("circle#c1 scaled back by 2");
    expect(ctx.document?.findById("c1")?.geometrySummary()).toBe("cx=100 cy=100 r=20");
  });

  it("容器缩放递归到子孙", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["g", "g1"]);
    run(ctx, create, ["rect", "r1", "10", "20", "100", "50", "in", "g1"]);
    run(ctx, new ScaleCommand(), ["g1", "2"]);
    expect(ctx.document?.findById("r1")?.geometrySummary()).toBe("x=20 y=40 w=200 h=100");
  });
});

describe("set", () => {
  const init = new InitCommand();
  const create = new CreateCommand();

  it("回显 updated，undo 用旧值", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["text", "t1", "20", "40", "My Diagram"]);
    run(ctx, new SetCommand(), ["t1", "text", "My Diagram v2"]);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe('text#t1 updated: text="My Diagram v2"');
    run(ctx, new UndoCommand(), []);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe('text#t1 updated: text="My Diagram"');
  });

  it("设置几何属性与公共属性", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["rect", "r1", "0", "0", "10", "10"]);
    run(ctx, new SetCommand(), ["r1", "width", "99"]);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe('rect#r1 updated: width="99"');
    run(ctx, new SetCommand(), ["r1", "fill", "#eee"]);
    expect(ctx.document?.findById("r1")?.presentationSummary()).toBe("fill=#eee");
  });

  it("白名单外报 unknown attribute 且状态不变", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["rect", "r1", "0", "0", "10", "10"]);
    expect(() => run(ctx, new SetCommand(), ["r1", "opacity", "0.5"])).toThrowError(
      "unknown attribute: opacity",
    );
    expect(ctx.document?.elementCount()).toBe(1);
  });
});

describe("delete 与 undo/redo 交互", () => {
  const init = new InitCommand();
  const create = new CreateCommand();

  it("undo 删除恢复到原父容器", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["g", "markers"]);
    run(ctx, create, ["rect", "box", "200", "80", "60", "60", "in", "markers"]);
    run(ctx, new DeleteCommand(), ["box"]);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("rect#box deleted");
    expect(ctx.document?.findById("box")).toBeNull();

    run(ctx, new UndoCommand(), []);
    expect((ctx.output as BufferOutput).lines.at(-1)).toBe("rect#box restored into g#markers");
    expect(ctx.document?.findById("box")?.parent).toBe(ctx.document?.findById("markers"));
    expect(ctx.document?.elementCount()).toBe(2);
  });

  it("undo 后新编辑清空 redo", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["rect", "r1", "0", "0", "1", "1"]);
    run(ctx, new MoveCommand(), ["r1", "5", "5"]);
    run(ctx, new UndoCommand(), []);
    run(ctx, create, ["circle", "c1", "0", "0", "1"]);
    expect(() => run(ctx, new RedoCommand(), [])).toThrowError("nothing to redo");
  });

  it("undo 的 undo 单元是整条命令（create 容器+图形为多条独立命令）", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["g", "g1"]);
    run(ctx, new UndoCommand(), []);
    expect(ctx.document?.findById("g1")).toBeNull();
  });

  it("group 的 label 在 clone 后保持（快照往返）", () => {
    const ctx = newEditor();
    run(ctx, init, []);
    run(ctx, create, ["g", "g1"]);
    run(ctx, create, ["rect", "r1", "0", "0", "1", "1", "in", "g1"]);
    run(ctx, new MoveCommand(), ["g1", "1", "1"]);
    run(ctx, new UndoCommand(), []);
    run(ctx, new RedoCommand(), []);
    run(ctx, new UndoCommand(), []);
    expect((ctx.document?.findById("r1")?.parent as Group).label()).toBe("g#g1");
  });
});
