import { Group } from "../model/Group.js";
import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 编辑类：解散容器，子图形提升到原容器的父级、占据原容器的位置 */
export class UngroupCommand implements Command {
  readonly name = "ungroup";
  readonly usage = "ungroup <gid>";
  readonly help = "dissolve a container, lifting its children into the parent";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 1) throw new SvgError(`usage: ${this.usage}`);
    const gid = doc.require(args[0]!);
    if (!(gid instanceof Group)) throw new SvgError(`not a container: ${gid.id}`);
    const parent = gid.parent;
    if (!parent) throw new SvgError(`cannot ungroup top-level container: ${gid.id}`);

    const children = [...gid.getChildren()];
    const at = parent.indexOfChild(gid);

    const before = doc.snapshot();
    doc.detach(gid);
    for (const [i, child] of children.entries()) {
      doc.detach(child);
      doc.insert(child, parent, at + i);
    }

    const dissolved = `${gid.label()} dissolved`;
    ctx.output.line(dissolved);
    ctx.history.record({
      before,
      after: doc.snapshot(),
      undoLine: `${gid.label()} recreated with ${children.length} children`,
      redoLine: dissolved,
    });
  }
}
