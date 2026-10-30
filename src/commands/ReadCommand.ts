import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 文档类：读入 SVG 为当前文档；缺 id 自动补并打印警告 */
export class ReadCommand implements Command {
  readonly name = "read";
  readonly usage = "read <file.svg>";
  readonly help = "read an SVG file as the current document";

  execute(args: string[], ctx: Editor): void {
    if (args.length !== 1) throw new SvgError(`usage: ${this.usage}`);
    const { document, warnings } = ctx.reader.read(args[0]!);
    ctx.replaceDocument(document);
    for (const warning of warnings) ctx.output.line(warning);
    ctx.output.line(`read ${args[0]} (${document.elementCount()} elements)`);
  }
}
