import { AddtoCommand } from "../commands/AddtoCommand.js";
import { BackCommand } from "../commands/BackCommand.js";
import { CanvasCommand } from "../commands/CanvasCommand.js";
import { CreateCommand } from "../commands/CreateCommand.js";
import { DeleteCommand } from "../commands/DeleteCommand.js";
import { Editor } from "../commands/Editor.js";
import { FrontCommand } from "../commands/FrontCommand.js";
import { GroupCommand } from "../commands/GroupCommand.js";
import { HelpCommand } from "../commands/HelpCommand.js";
import { InitCommand } from "../commands/InitCommand.js";
import { MoveCommand } from "../commands/MoveCommand.js";
import { Output } from "../commands/Output.js";
import { ReadCommand } from "../commands/ReadCommand.js";
import { RedoCommand } from "../commands/RedoCommand.js";
import { SaveCommand } from "../commands/SaveCommand.js";
import { ScaleCommand } from "../commands/ScaleCommand.js";
import { SetCommand } from "../commands/SetCommand.js";
import { ShowCommand } from "../commands/ShowCommand.js";
import { TreeCommand } from "../commands/TreeCommand.js";
import { UngroupCommand } from "../commands/UngroupCommand.js";
import { UndoCommand } from "../commands/UndoCommand.js";
import { createDefaultShapeFactory } from "../factory/ShapeFactory.js";
import { SvgReader } from "../io/SvgReader.js";
import { SvgWriter } from "../io/SvgWriter.js";
import { CommandRegistry } from "./CommandRegistry.js";
import { Repl } from "./Repl.js";

export interface App {
  repl: Repl;
  editor: Editor;
  registry: CommandRegistry;
}

/** 组装根：模型/服务/命令/REPL 的唯一装配点（入口与测试共用） */
export function createApp(input: NodeJS.ReadStream, output: Output): App {
  const factory = createDefaultShapeFactory();
  const editor = new Editor(factory, output, new SvgReader(factory), new SvgWriter());

  const registry = new CommandRegistry();
  registry.register(new InitCommand());
  registry.register(new CanvasCommand());
  registry.register(new SaveCommand());
  registry.register(new ReadCommand());
  registry.register(new CreateCommand());
  registry.register(new DeleteCommand());
  registry.register(new MoveCommand());
  registry.register(new ScaleCommand());
  registry.register(new SetCommand());
  registry.register(new GroupCommand());
  registry.register(new UngroupCommand());
  registry.register(new AddtoCommand());
  registry.register(new FrontCommand());
  registry.register(new BackCommand());
  registry.register(new UndoCommand());
  registry.register(new RedoCommand());
  registry.register(new TreeCommand());
  registry.register(new ShowCommand());
  registry.register(new HelpCommand(registry));

  return { repl: new Repl(input, output, registry, editor), editor, registry };
}
