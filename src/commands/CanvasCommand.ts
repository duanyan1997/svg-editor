import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";
import { parsePositiveSize } from "./parse.js";

/**
 * 文档类：无参数显示画布尺寸（不锁定 undo）；带参数修改尺寸（锁定 undo）。
 */
export class CanvasCommand implements Command {
  readonly name = "canvas";
  readonly usage = "canvas [w] [h]";
  readonly help = "show canvas size, or resize it (resize disables undo until next edit)";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length === 0) {
      ctx.output.line(`canvas ${doc.width}x${doc.height}`);
      return;
    }
    if (args.length !== 2) throw new SvgError(`usage: ${this.usage}`);
    const width = parsePositiveSize(args[0]!);
    const height = parsePositiveSize(args[1]!);
    doc.resize(width, height);
    ctx.history.lockByIo();
    ctx.output.line(`canvas resized to ${width}x${height}`);
  }
}
