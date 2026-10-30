import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 编辑类：删除图形（容器连同全部子孙） */
export class DeleteCommand implements Command {
  readonly name = "delete";
  readonly usage = "delete <id>";
  readonly help = "delete a shape (a container with all its descendants)";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 1) throw new SvgError(`usage: ${this.usage}`);
    const shape = doc.require(args[0]!);
    const parentLabel = shape.parent ? shape.parent.label() : "svg";

    const before = doc.snapshot();
    doc.detach(shape);
    const deleted = `${shape.label()} deleted`;
    ctx.output.line(deleted);
    ctx.history.record({
      before,
      after: doc.snapshot(),
      undoLine: `${shape.label()} restored into ${parentLabel}`,
      redoLine: deleted,
    });
  }
}
