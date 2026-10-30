import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 文档类：保存当前文档；无参数时保存到读入/上次保存的路径 */
export class SaveCommand implements Command {
  readonly name = "save";
  readonly usage = "save [file.svg]";
  readonly help = "save the current document (defaults to the last read/saved path)";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length > 1) throw new SvgError(`usage: ${this.usage}`);
    const path = args[0] ?? doc.sourcePath;
    if (!path) throw new SvgError("no save path. use 'save <file.svg>'");
    ctx.writer.write(doc, path);
    doc.setSourcePath(path);
    ctx.history.lockByIo();
    ctx.output.line(`saved to ${path} (${doc.elementCount()} elements)`);
  }
}
