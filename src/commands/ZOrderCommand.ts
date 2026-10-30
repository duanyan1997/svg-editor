import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** front / back 的公共骨架（Template Method）：仅方向不同 */
export abstract class ZOrderCommand implements Command {
  abstract readonly name: string;
  abstract readonly usage: string;
  abstract readonly help: string;
  protected abstract readonly toFront: boolean;

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 1) throw new SvgError(`usage: ${this.usage}`);
    const shape = doc.require(args[0]!);

    const before = doc.snapshot();
    if (this.toFront) doc.moveToFront(shape);
    else doc.moveToBack(shape);
    const redoLine = `${shape.label()} ${this.toFront ? "brought to front" : "sent to back"}`;
    ctx.output.line(redoLine);
    ctx.history.record({
      before,
      after: doc.snapshot(),
      undoLine: `${shape.label()} z-order restored`,
      redoLine,
    });
  }
}
