import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 重做；undo 后若有新编辑，redo 栈已被清空（History 负责） */
export class RedoCommand implements Command {
  readonly name = "redo";
  readonly usage = "redo";
  readonly help = "redo an undone edit command";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 0) throw new SvgError(`usage: ${this.usage}`);
    ctx.output.line(ctx.history.redo(doc));
  }
}
