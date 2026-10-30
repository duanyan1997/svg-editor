import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 撤销上一条编辑命令；文档类命令后禁止（History 负责） */
export class UndoCommand implements Command {
  readonly name = "undo";
  readonly usage = "undo";
  readonly help = "undo the last edit command";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 0) throw new SvgError(`usage: ${this.usage}`);
    ctx.output.line(ctx.history.undo(doc));
  }
}
