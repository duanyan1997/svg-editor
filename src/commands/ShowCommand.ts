import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

const PRESENTATION_ATTRS = ["fill", "stroke", "stroke-width"] as const;

/** 显示类：单个图形的属性明细 */
export class ShowCommand implements Command {
  readonly name = "show";
  readonly usage = "show <id>";
  readonly help = "show one shape's details (geometry and presentation attributes)";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length !== 1) throw new SvgError(`usage: ${this.usage}`);
    const shape = doc.require(args[0]!);

    ctx.output.line(`${shape.label()}  parent=${shape.parent ? shape.parent.label() : "svg"}`);
    const geometry = shape.geometrySummary();
    if (geometry !== "") ctx.output.line(`  ${geometry}`);
    for (const attr of PRESENTATION_ATTRS) {
      const value = shape.getAttr(attr);
      if (value !== undefined) ctx.output.line(`  ${attr}=${value}`);
    }
  }
}
