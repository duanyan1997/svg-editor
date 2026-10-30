import { SvgDocument } from "../model/SvgDocument.js";
import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";
import { parsePositiveSize } from "./parse.js";

/** 文档类：新建空画布作为当前文档；执行后 undo/redo 禁止 */
export class InitCommand implements Command {
  readonly name = "init";
  readonly usage = "init [w] [h]";
  readonly help = "create a new empty canvas (default 800x600)";

  execute(args: string[], ctx: Editor): void {
    let doc: SvgDocument;
    if (args.length === 0) {
      doc = new SvgDocument();
    } else if (args.length === 2) {
      doc = new SvgDocument(parsePositiveSize(args[0]!), parsePositiveSize(args[1]!));
    } else {
      throw new SvgError(`usage: ${this.usage}`);
    }
    ctx.replaceDocument(doc);
    ctx.output.line(`canvas ${doc.width}x${doc.height} created`);
  }
}
