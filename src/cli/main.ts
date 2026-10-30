import { CanvasCommand } from "../commands/CanvasCommand.js";
import { Editor } from "../commands/Editor.js";
import { InitCommand } from "../commands/InitCommand.js";
import { Output } from "../commands/Output.js";
import { ReadCommand } from "../commands/ReadCommand.js";
import { SaveCommand } from "../commands/SaveCommand.js";
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

  return { repl: new Repl(process.stdin, output, registry, editor), editor };
}

const { repl } = bootstrap(new StdoutOutput());
await repl.run();
