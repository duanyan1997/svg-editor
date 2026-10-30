import { formatNumber, parseNumber } from "../model/format.js";
import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 编辑类：等比缩放，factor 同乘全部几何属性；容器递归到每个子孙 */
export class ScaleCommand implements Command {
  readonly name = "scale";
  readonly usage = "scale <id> <factor>";
  readonly help = "scale a shape uniformly (containers scale every descendant)";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 2) throw new SvgError(`usage: ${this.usage}`);
    const shape = doc.require(args[0]!);
    const factor = parseNumber("factor", args[1]!);
    if (factor <= 0) throw new SvgError("scale factor must be positive");

    const before = doc.snapshot();
    shape.scaleBy(factor);
    const redoLine = `${shape.label()} scaled by ${formatNumber(factor)}`;
    const undoLine = `${shape.label()} scaled back by ${formatNumber(1 / factor)}`;
    ctx.output.line(redoLine);
    ctx.history.record({ before, after: doc.snapshot(), undoLine, redoLine });
  }
}
