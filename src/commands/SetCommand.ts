import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 编辑类：按白名单设置属性；回显 `updated: <attr>="<value>"`，undo 用旧值 */
export class SetCommand implements Command {
  readonly name = "set";
  readonly usage = "set <id> <attr> <value>";
  readonly help =
    "set fill/stroke/stroke-width or the shape's own geometry attributes (see help create)";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 3) throw new SvgError(`usage: ${this.usage}`);
    const shape = doc.require(args[0]!);
    const attr = args[1]!;
    const value = args[2]!;

    const oldValue = shape.getAttr(attr);
    const before = doc.snapshot();
    shape.setAttr(attr, value); // 白名单校验先于状态变更（抛错即整条失败）
    const redoLine = `${shape.label()} updated: ${attr}="${value}"`;
    const undoLine =
      oldValue === undefined
        ? `${shape.label()} updated: ${attr} unset`
        : `${shape.label()} updated: ${attr}="${oldValue}"`;
    ctx.output.line(redoLine);
    ctx.history.record({ before, after: doc.snapshot(), undoLine, redoLine });
  }
}
