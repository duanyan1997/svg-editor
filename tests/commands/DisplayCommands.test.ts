import { describe, expect, it } from "vitest";

import { CreateCommand } from "../../src/commands/CreateCommand.js";
import { Editor } from "../../src/commands/Editor.js";
import { GroupCommand } from "../../src/commands/GroupCommand.js";
import { HelpCommand } from "../../src/commands/HelpCommand.js";
import { InitCommand } from "../../src/commands/InitCommand.js";
import { MoveCommand } from "../../src/commands/MoveCommand.js";
import { BufferOutput } from "../../src/commands/Output.js";
import { ShowCommand } from "../../src/commands/ShowCommand.js";
import { TreeCommand } from "../../src/commands/TreeCommand.js";
import { UndoCommand } from "../../src/commands/UndoCommand.js";
import { createDefaultShapeFactory } from "../../src/factory/ShapeFactory.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { SvgReader } from "../../src/io/SvgReader.js";
import { SvgWriter } from "../../src/io/SvgWriter.js";

function newEditor(): { ctx: Editor; lines: () => string[] } {
  const factory = createDefaultShapeFactory();
  const ctx = new Editor(factory, new BufferOutput(), new SvgReader(factory), new SvgWriter());
  return { ctx, lines: () => (ctx.output as BufferOutput).lines };
}

/** §6 transcript 前半段：四个图形 + group */
function buildSession(): { ctx: Editor; lines: () => string[] } {
  const { ctx, lines } = newEditor();
  const create = new CreateCommand();
  new InitCommand().execute([], ctx);
  create.execute(["rect", "bg", "0", "0", "800", "600", "#ffffff"], ctx);
  create.execute(["text", "title", "20", "40", "My Diagram"], ctx);
  create.execute(["circle", "c1", "100", "100", "20", "red"], ctx);
  create.execute(["rect", "box", "200", "80", "60", "60", "#3366ff"], ctx);
  new GroupCommand().execute(["markers", "c1", "box"], ctx);
  return { ctx, lines };
}

describe("tree", () => {
  it("全文档树内联几何属性（对齐 §5.1）", () => {
    const { ctx, lines } = buildSession();
    new MoveCommand().execute(["c1", "30", "0"], ctx);
    lines().length = 0;
    new TreeCommand().execute([], ctx);
    expect(lines()).toEqual([
      "svg (800x600)",
      "├── rect#bg     x=0 y=0 w=800 h=600 fill=#ffffff",
      "├── text#title  (20,40) \"My Diagram\"",
      "└── g#markers",
      "    ├── circle#c1  cx=130 cy=100 r=20 fill=red",
      "    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff",
    ]);
  });

  it("tree <id> 只显示以该 id 为根的子树", () => {
    const { ctx, lines } = buildSession();
    lines().length = 0;
    new TreeCommand().execute(["markers"], ctx);
    expect(lines()).toEqual([
      "g#markers",
      "├── circle#c1  cx=100 cy=100 r=20 fill=red",
      "└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff",
    ]);
  });

  it("叶子子树只有一行", () => {
    const { ctx, lines } = buildSession();
    lines().length = 0;
    new TreeCommand().execute(["title"], ctx);
    expect(lines()).toEqual(['text#title  (20,40) "My Diagram"']);
  });

  it("深层嵌套用 │ 延续线", () => {
    const { ctx, lines } = newEditor();
    const create = new CreateCommand();
    new InitCommand().execute([], ctx);
    create.execute(["g", "outer"], ctx);
    create.execute(["g", "inner", "in", "outer"], ctx);
    create.execute(["circle", "c1", "0", "0", "1", "in", "inner"], ctx);
    create.execute(["g", "sibling", "in", "outer"], ctx);
    lines().length = 0;
    new TreeCommand().execute([], ctx);
    expect(lines()).toEqual([
      "svg (800x600)",
      "└── g#outer",
      "    ├── g#inner",
      "    │   └── circle#c1  cx=0 cy=0 r=1",
      "    └── g#sibling",
    ]);
  });

  it("id 不存在报错", () => {
    const { ctx } = buildSession();
    expect(() => new TreeCommand().execute(["ghost"], ctx)).toThrowError("no such shape: ghost");
  });
});

describe("show", () => {
  it("明细含父容器与分组属性行（对齐 §5.2）", () => {
    const { ctx, lines } = buildSession();
    new ShowCommand().execute(["c1"], ctx);
    expect(lines().slice(-3)).toEqual([
      "circle#c1  parent=g#markers",
      "  cx=100 cy=100 r=20",
      "  fill=red",
    ]);
  });

  it("顶层图形 parent=svg；无公共属性时无属性行", () => {
    const { ctx, lines } = newEditor();
    new InitCommand().execute([], ctx);
    new CreateCommand().execute(["g", "g1"], ctx);
    new ShowCommand().execute(["g1"], ctx);
    expect(lines().slice(-1)).toEqual(["g#g1  parent=svg"]);
  });

  it("text 明细内联内容", () => {
    const { ctx, lines } = buildSession();
    new ShowCommand().execute(["title"], ctx);
    expect(lines().slice(-2)).toEqual(['text#title  parent=svg', '  (20,40) "My Diagram"']);
  });
});

describe("help", () => {
  it("列出全部命令并对齐", () => {
    const { ctx, lines } = newEditor();
    const registry = new CommandRegistry();
    registry.register(new InitCommand());
    registry.register(new TreeCommand());
    registry.register(new HelpCommand(registry));
    new HelpCommand(registry).execute([], ctx);
    expect(lines()).toEqual([
      "init [w] [h]  — create a new empty canvas (default 800x600)",
      "tree [id]     — print the structure tree with inline geometry",
      "help          — show all commands and syntax",
    ]);
  });

  it("无文档也可用", () => {
    const { ctx } = newEditor();
    const registry = new CommandRegistry();
    registry.register(new HelpCommand(registry));
    expect(() => new HelpCommand(registry).execute([], ctx)).not.toThrowError();
  });
});

describe("显示类不进入 undo 栈", () => {
  it("tree/show 后 undo 仍指向上一条编辑命令", () => {
    const { ctx, lines } = buildSession();
    new MoveCommand().execute(["c1", "30", "0"], ctx);
    new TreeCommand().execute([], ctx);
    new ShowCommand().execute(["c1"], ctx);
    new UndoCommand().execute([], ctx);
    expect(lines().at(-1)).toBe("circle#c1 moved back to (100,100)");
  });
});
