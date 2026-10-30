import { Group } from "../model/Group.js";
import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 编辑类：把已有图形移入容器（作为最后一个子节点） */
export class AddtoCommand implements Command {
  readonly name = "addto";
  readonly usage = "addto <gid> <id>";
  readonly help = "move an existing shape into a container (appended last)";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 2) throw new SvgError(`usage: ${this.usage}`);
    const gid = args[0]!;
    const target = doc.findById(gid);
    if (!target) throw new SvgError(`no such container: ${gid}`);
    if (!(target instanceof Group)) throw new SvgError(`not a container: ${gid}`);
    const shape = doc.require(args[1]!);
    if (shape === target || (shape instanceof Group && shape.contains(target))) {
      throw new SvgError(`cannot add a container into its own descendant: ${shape.id}`);
    }

    const oldParentLabel = shape.parent ? shape.parent.label() : "svg";
    const before = doc.snapshot();
    doc.detach(shape);
    doc.insert(shape, target);
    const moved = `${shape.label()} moved into ${target.label()}`;
    ctx.output.line(moved);
    ctx.history.record({
      before,
      after: doc.snapshot(),
      undoLine: `${shape.label()} moved back into ${oldParentLabel}`,
      redoLine: moved,
    });
  }
}
