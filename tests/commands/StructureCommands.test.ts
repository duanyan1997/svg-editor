import { describe, expect, it } from "vitest";

import { AddtoCommand } from "../../src/commands/AddtoCommand.js";
import { BackCommand } from "../../src/commands/BackCommand.js";
import { CreateCommand } from "../../src/commands/CreateCommand.js";
import { Editor } from "../../src/commands/Editor.js";
import { FrontCommand } from "../../src/commands/FrontCommand.js";
import { GroupCommand } from "../../src/commands/GroupCommand.js";
import { InitCommand } from "../../src/commands/InitCommand.js";
import { MoveCommand } from "../../src/commands/MoveCommand.js";
import { BufferOutput } from "../../src/commands/Output.js";
import { UndoCommand } from "../../src/commands/UndoCommand.js";
import { UngroupCommand } from "../../src/commands/UngroupCommand.js";
import { createDefaultShapeFactory } from "../../src/factory/ShapeFactory.js";
import { SvgReader } from "../../src/io/SvgReader.js";
import { SvgWriter } from "../../src/io/SvgWriter.js";
import { Group } from "../../src/model/Group.js";

function newEditor(): Editor {
  const factory = createDefaultShapeFactory();
  return new Editor(factory, new BufferOutput(), new SvgReader(factory), new SvgWriter());
}

function lines(ctx: Editor): string[] {
  return (ctx.output as BufferOutput).lines;
}

/** 搭建 §6 transcript 前半段的结构：bg/title/c1/box + markers 组 */
function buildSession(): Editor {
  const ctx = newEditor();
  const create = new CreateCommand();
  new InitCommand().execute([], ctx);
  create.execute(["rect", "bg", "0", "0", "800", "600", "#ffffff"], ctx);
  create.execute(["text", "title", "20", "40", "My Diagram"], ctx);
  create.execute(["circle", "c1", "100", "100", "20", "red"], ctx);
  create.execute(["rect", "box", "200", "80", "60", "60", "#3366ff"], ctx);
  return ctx;
}

describe("group", () => {
  it("收编图形并保持命令行顺序，回显 children 数", () => {
    const ctx = buildSession();
    new GroupCommand().execute(["markers", "c1", "box"], ctx);
    expect(lines(ctx).at(-1)).toBe("g#markers created with 2 children");
    const markers = ctx.document?.findById("markers") as Group;
    expect(markers.getChildren().map((s) => s.id)).toEqual(["c1", "box"]);
    expect(ctx.document?.findById("c1")?.parent).toBe(markers);
    expect(ctx.document?.elementCount()).toBe(5);
  });

  it("容器收入自己的子孙报错且状态不变", () => {
    const ctx = buildSession();
    new GroupCommand().execute(["markers", "c1", "box"], ctx);
    const before = ctx.document?.elementCount();
    expect(() => new GroupCommand().execute(["bad", "c1", "markers"], ctx)).toThrowError(
      "cannot group a container into its own descendant: markers",
    );
    expect(ctx.document?.findById("bad")).toBeNull();
    expect(ctx.document?.elementCount()).toBe(before);
  });

  it("嵌套容器的间接子孙同样被拒", () => {
    const ctx = buildSession();
    const create = new CreateCommand();
    create.execute(["g", "outer"], ctx);
    create.execute(["g", "inner", "in", "outer"], ctx);
    create.execute(["rect", "deep", "0", "0", "1", "1", "in", "inner"], ctx);
    expect(() => new GroupCommand().execute(["bad", "outer", "deep"], ctx)).toThrowError(
      "cannot group a container into its own descendant: outer",
    );
  });

  it("undo 整体还原（成员回到原父容器）", () => {
    const ctx = buildSession();
    new GroupCommand().execute(["markers", "c1", "box"], ctx);
    new UndoCommand().execute([], ctx);
    expect(lines(ctx).at(-1)).toBe("g#markers dissolved");
    expect(ctx.document?.findById("markers")).toBeNull();
    expect(ctx.document?.findById("c1")?.parent).toBeNull();
    expect(ctx.document?.elementCount()).toBe(4);
  });
});

describe("ungroup", () => {
  const ungroup = new UngroupCommand();
  const undo = new UndoCommand();

  it("子图形提升到父级并占据原容器位置", () => {
    const ctx = buildSession();
    const create = new CreateCommand();
    create.execute(["g", "outer"], ctx);
    create.execute(["g", "inner", "in", "outer"], ctx);
    create.execute(["rect", "r1", "0", "0", "1", "1", "in", "inner"], ctx);
    create.execute(["rect", "r2", "2", "2", "1", "1", "in", "inner"], ctx);

    ungroup.execute(["inner"], ctx);
    expect(lines(ctx).at(-1)).toBe("g#inner dissolved");
    const outer = ctx.document?.findById("outer") as Group;
    expect(outer.getChildren().map((s) => s.id)).toEqual(["r1", "r2"]);
    expect(ctx.document?.findById("r1")?.parent).toBe(outer);
  });

  it("顶层容器拒绝解散", () => {
    const ctx = buildSession();
    new CreateCommand().execute(["g", "scene"], ctx);
    expect(() => ungroup.execute(["scene"], ctx)).toThrowError(
      "cannot ungroup top-level container: scene",
    );
  });

  it("叶子图形拒绝解散", () => {
    const ctx = buildSession();
    expect(() => ungroup.execute(["c1"], ctx)).toThrowError("not a container: c1");
  });

  it("undo 重建容器及成员关系", () => {
    const ctx = buildSession();
    const create = new CreateCommand();
    create.execute(["g", "outer"], ctx);
    create.execute(["g", "inner", "in", "outer"], ctx);
    create.execute(["rect", "r1", "0", "0", "1", "1", "in", "inner"], ctx);

    ungroup.execute(["inner"], ctx);
    undo.execute([], ctx);
    expect(lines(ctx).at(-1)).toBe("g#inner recreated with 1 children");
    const inner = ctx.document?.findById("inner") as Group;
    expect(ctx.document?.findById("r1")?.parent).toBe(inner);
    expect((ctx.document?.findById("r1")?.parent as Group).parent).toBe(
      ctx.document?.findById("outer"),
    );
  });
});

describe("addto", () => {
  const addto = new AddtoCommand();

  it("移动归属并作为最后一个子节点", () => {
    const ctx = buildSession();
    new GroupCommand().execute(["markers", "c1", "box"], ctx);
    addto.execute(["markers", "title"], ctx);
    expect(lines(ctx).at(-1)).toBe("text#title moved into g#markers");
    const markers = ctx.document?.findById("markers") as Group;
    expect(markers.getChildren().map((s) => s.id)).toEqual(["c1", "box", "title"]);
  });

  it("容器加入自己的子孙被拒", () => {
    const ctx = buildSession();
    new GroupCommand().execute(["markers", "c1", "box"], ctx);
    expect(() => addto.execute(["markers", "markers"], ctx)).toThrowError(
      "cannot add a container into its own descendant: markers",
    );
    new CreateCommand().execute(["g", "outer"], ctx);
    new CreateCommand().execute(["g", "inner", "in", "outer"], ctx);
    expect(() => addto.execute(["inner", "outer"], ctx)).toThrowError(
      "cannot add a container into its own descendant: outer",
    );
  });

  it("undo 回到原父容器", () => {
    const ctx = buildSession();
    new GroupCommand().execute(["markers", "c1", "box"], ctx);
    addto.execute(["markers", "title"], ctx);
    new UndoCommand().execute([], ctx);
    expect(lines(ctx).at(-1)).toBe("text#title moved back into svg");
    expect(ctx.document?.findById("title")?.parent).toBeNull();
  });
});

describe("front / back", () => {
  it("调整同级顺序并回显", () => {
    const ctx = buildSession();
    new FrontCommand().execute(["bg"], ctx);
    expect(lines(ctx).at(-1)).toBe("rect#bg brought to front");
    const ids = ctx.document?.topLevels().map((s) => s.id);
    expect(ids?.at(-1)).toBe("bg");

    new BackCommand().execute(["bg"], ctx);
    expect(lines(ctx).at(-1)).toBe("rect#bg sent to back");
    expect(ctx.document?.topLevels().map((s) => s.id)[0]).toBe("bg");
  });

  it("undo 恢复 z-order", () => {
    const ctx = buildSession();
    const before = ctx.document?.topLevels().map((s) => s.id);
    new FrontCommand().execute(["bg"], ctx);
    new UndoCommand().execute([], ctx);
    expect(ctx.document?.topLevels().map((s) => s.id)).toEqual(before);
  });

  it("容器内部同样生效", () => {
    const ctx = buildSession();
    new GroupCommand().execute(["markers", "c1", "box"], ctx);
    const markers = ctx.document?.findById("markers") as Group;
    new BackCommand().execute(["box"], ctx);
    expect(markers.getChildren().map((s) => s.id)[0]).toBe("box");
  });
});
