import { Group } from "../model/Group.js";
import { Shape } from "../model/Shape.js";
import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 显示类：结构树（属性内联），tree <id> 只显示以该 id 为根的子树 */
export class TreeCommand implements Command {
  readonly name = "tree";
  readonly usage = "tree [id]";
  readonly help = "print the structure tree with inline geometry";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length > 1) throw new SvgError(`usage: ${this.usage}`);

    if (args.length === 1) {
      const root = doc.require(args[0]!);
      const lines = [rootLine(root)];
      this.renderChildren(root, "", lines);
      for (const line of lines) ctx.output.line(line);
      return;
    }

    ctx.output.line(`svg (${doc.width}x${doc.height})`);
    const lines: string[] = [];
    this.renderList(doc.topLevels(), "", lines);
    for (const line of lines) ctx.output.line(line);
  }

  /** 逐层渲染：标签列按「同级最长标签 + 2」对齐，末尾空白裁掉 */
  private renderList(siblings: readonly Shape[], prefix: string, out: string[]): void {
    const width = Math.max(...siblings.map((s) => s.label().length));
    for (const [i, shape] of siblings.entries()) {
      const isLast = i === siblings.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const line = prefix + connector + shape.label().padEnd(width + 2) + summaryOf(shape);
      out.push(line.trimEnd());
      this.renderChildren(shape, prefix + (isLast ? "    " : "│   "), out);
    }
  }

  private renderChildren(shape: Shape, prefix: string, out: string[]): void {
    if (shape instanceof Group && shape.childCount() > 0) {
      this.renderList(shape.getChildren(), prefix, out);
    }
  }
}

export function summaryOf(shape: Shape): string {
  const geometry = shape.geometrySummary();
  const presentation = shape.presentationSummary();
  if (geometry === "") return presentation;
  return presentation === "" ? geometry : `${geometry} ${presentation}`;
}

export function rootLine(shape: Shape): string {
  const summary = summaryOf(shape);
  return summary === "" ? shape.label() : `${shape.label()}  ${summary}`;
}
