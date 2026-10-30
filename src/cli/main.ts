import { CanvasCommand } from "../commands/CanvasCommand.js";
import { CreateCommand } from "../commands/CreateCommand.js";
import { DeleteCommand } from "../commands/DeleteCommand.js";
import { Editor } from "../commands/Editor.js";
import { InitCommand } from "../commands/InitCommand.js";
import { MoveCommand } from "../commands/MoveCommand.js";
import { Output } from "../commands/Output.js";
import { ReadCommand } from "../commands/ReadCommand.js";
import { RedoCommand } from "../commands/RedoCommand.js";
import { SaveCommand } from "../commands/SaveCommand.js";
import { ScaleCommand } from "../commands/ScaleCommand.js";
import { SetCommand } from "../commands/SetCommand.js";
import { UndoCommand } from "../commands/UndoCommand.js";
import { createDefaultShapeFactory } from "../factory/ShapeFactory.js";
import { SvgReader } from "../io/SvgReader.js";
import { SvgWriter } from "../io/SvgWriter.js";
import { CommandRegistry } from "./CommandRegistry.js";
import { Repl } from "./Repl.js";
import { StdoutOutput } from "./StdoutOutput.js";

function bootstrap(output: Output): { repl: Repl; editor: Editor } {
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
  registry.register(new UndoCommand());
  registry.register(new RedoCommand());

  return { repl: new Repl(process.stdin, output, registry, editor), editor };
}

const { repl } = bootstrap(new StdoutOutput());
await repl.run();
