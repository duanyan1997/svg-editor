import { Position } from "./format.js";
import { SvgError } from "./SvgError.js";
import { Shape } from "./Shape.js";

/** 容器（Composite 的 Branch）：自身无几何，move/scale 递归到全部子孙 */
export class Group extends Shape {
  private readonly children: Shape[] = [];

  get typeName(): string {
    return "g";
  }

  /** 读入路径：g 容器自身只带公共属性，子元素由调用方挂载 */
  static fromSvg(id: string, attrs: Record<string, string>): Group {
    const group = new Group(id);
    group.applyPresentationAttrs(attrs);
    return group;
  }

  getChildren(): readonly Shape[] {
    return this.children;
  }

  /** 结构变更仅由 SvgDocument 驱动（保证 id 索引一致），此处只做挂载 */
  insertChild(index: number, shape: Shape): void {
    shape.parent = this;
    const at = Math.min(index, this.children.length);
    this.children.splice(at, 0, shape);
  }

  removeChild(shape: Shape): void {
    const at = this.children.indexOf(shape);
    if (at >= 0) this.children.splice(at, 1);
  }

  indexOfChild(shape: Shape): number {
    return this.children.indexOf(shape);
  }

  childCount(): number {
    return this.children.length;
  }

  translate(dx: number, dy: number): void {
    for (const child of this.children) child.translate(dx, dy);
  }

  scaleBy(factor: number): void {
    for (const child of this.children) child.scaleBy(factor);
  }

  /** g 无自有几何属性，白名单为空 */
  protected setGeometryAttr(name: string): void {
    throw new SvgError(`unknown attribute: ${name}`);
  }

  protected geometryAttr(): string | undefined {
    return undefined;
  }

  geometrySummary(): string {
    return "";
  }

  /** 容器无定位点（move 回显走 "moved by" 分支） */
  anchor(): Position {
    return { x: 0, y: 0 };
  }

  serialize(out: string[], indent: number): void {
    const pad = "  ".repeat(indent);
    const attrs = this.presentationAttrs();
    if (this.children.length === 0) {
      out.push(`${pad}<g ${attrs}/>`);
      return;
    }
    out.push(`${pad}<g ${attrs}>`);
    for (const child of this.children) child.serialize(out, indent + 1);
    out.push(`${pad}</g>`);
  }

  clone(): Group {
    const copy = new Group(this.id);
    copy.copyPresentationFrom(this);
    for (const child of this.children) {
      const childCopy = child.clone();
      copy.insertChild(copy.children.length, childCopy);
    }
    return copy;
  }
}
