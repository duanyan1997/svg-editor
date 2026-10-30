import { formatNumber, parseNumber } from "../model/format.js";
import { Group } from "../model/Group.js";
import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/**
 * 编辑类：平移（增量）。叶子回显落点 "moved to (x,y)"，容器回显增量 "moved by (dx,dy)"；
 * undo 相应回显 "moved back to/by"。
 */
export class MoveCommand implements Command {
  readonly name = "move";
  readonly usage = "move <id> <dx> <dy>";
  readonly help = "translate a shape (containers move as a whole)";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 3) throw new SvgError(`usage: ${this.usage}`);
    const shape = doc.require(args[0]!);
    const dx = parseNumber("dx", args[1]!);
    const dy = parseNumber("dy", args[2]!);
    const isContainer = shape instanceof Group;

    const oldAnchor = shape.anchor();
    const before = doc.snapshot();
    shape.translate(dx, dy);
    const newAnchor = shape.anchor();

    const redoLine = isContainer
      ? `${shape.label()} moved by (${formatNumber(dx)},${formatNumber(dy)})`
      : `${shape.label()} moved to (${formatNumber(newAnchor.x)},${formatNumber(newAnchor.y)})`;
    const undoLine = isContainer
      ? `${shape.label()} moved back by (${formatNumber(-dx)},${formatNumber(-dy)})`
      : `${shape.label()} moved back to (${formatNumber(oldAnchor.x)},${formatNumber(oldAnchor.y)})`;

    ctx.output.line(redoLine);
    ctx.history.record({ before, after: doc.snapshot(), undoLine, redoLine });
  }
}
