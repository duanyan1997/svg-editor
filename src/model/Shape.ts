import { Group } from "./Group.js";
import { formatNumber, parseNumber, Position } from "./format.js";
import { SvgError } from "./SvgError.js";

/**
 * 图形基类（Composite 的公共接口）：
 * move / scale / set / delete 等命令对叶子与容器一视同仁，
 * 类型差异全部由子类以多态表达，调用方不做类型分支。
 */
export abstract class Shape {
  readonly id: string;
  parent: Group | null = null;

  protected fill?: string;
  protected stroke?: string;
  protected strokeWidth?: number;

  constructor(id: string) {
    this.id = id;
  }

  abstract get typeName(): string;

  /** 平移（增量）。叶子改自身几何，容器递归到全部子孙 */
  abstract translate(dx: number, dy: number): void;

  /** 等比缩放：factor 同乘全部几何属性（位置与尺寸）。容器递归 */
  abstract scaleBy(factor: number): void;

  /** tree / show 内联的几何摘要，如 "x=0 y=0 w=10 h=20" */
  abstract geometrySummary(): string;

  /** 叶子图形的定位点（move 回显 "moved to (x,y)" 用）；容器不适用 */
  abstract anchor(): Position;

  /** XML 序列化：把自身（容器含子孙）写入行缓冲 */
  abstract serialize(out: string[], indent: number): void;

  /** 深拷贝（快照用）：公共属性由基类复制，几何字段由子类复制 */
  abstract clone(): Shape;

  /** CLI 语义的属性设置：fill/stroke/stroke-width 为公共白名单，其余交给子类几何白名单 */
  setAttr(name: string, value: string): void {
    if (name === "fill") {
      this.fill = value;
    } else if (name === "stroke") {
      this.stroke = value;
    } else if (name === "stroke-width") {
      this.strokeWidth = parseNumber(name, value);
    } else {
      this.setGeometryAttr(name, value);
    }
  }

  /** 读属性值（白名单内），未设置返回 undefined；set 的 undo 回显需要旧值 */
  getAttr(name: string): string | undefined {
    if (name === "fill") return this.fill;
    if (name === "stroke") return this.stroke;
    if (name === "stroke-width")
      return this.strokeWidth === undefined ? undefined : formatNumber(this.strokeWidth);
    return this.geometryAttr(name);
  }

  /** 各类型自身的几何属性白名单；不在白名单即未知属性 */
  protected abstract setGeometryAttr(name: string, value: string): void;

  /** 读几何属性值（白名单内），未设置返回 undefined */
  protected abstract geometryAttr(name: string): string | undefined;

  /** 非空的公共属性摘要（tree / show 追加用） */
  presentationSummary(): string {
    const parts: string[] = [];
    if (this.fill !== undefined) parts.push(`fill=${this.fill}`);
    if (this.stroke !== undefined) parts.push(`stroke=${this.stroke}`);
    if (this.strokeWidth !== undefined)
      parts.push(`stroke-width=${formatNumber(this.strokeWidth)}`);
    return parts.join(" ");
  }

  /** 类型名 + id，回显用：如 "rect#r1" */
  label(): string {
    return `${this.typeName}#${this.id}`;
  }

  /** XML 属性串公共部分：id + fill/stroke/stroke-width（仅非空项） */
  protected presentationAttrs(): string {
    const attrs: string[] = [`id="${this.id}"`];
    if (this.fill !== undefined) attrs.push(`fill="${xmlEscape(this.fill)}"`);
    if (this.stroke !== undefined) attrs.push(`stroke="${xmlEscape(this.stroke)}"`);
    if (this.strokeWidth !== undefined)
      attrs.push(`stroke-width="${formatNumber(this.strokeWidth)}"`);
    return attrs.join(" ");
  }

  protected copyPresentationFrom(other: Shape): void {
    this.fill = other.fill;
    this.stroke = other.stroke;
    this.strokeWidth = other.strokeWidth;
  }

  /** 读入路径的公共属性装配（fill / stroke / stroke-width，缺失即忽略） */
  protected applyPresentationAttrs(attrs: Record<string, string>): void {
    const fill = attrs["fill"];
    const stroke = attrs["stroke"];
    const strokeWidth = attrs["stroke-width"];
    if (fill !== undefined) this.fill = fill;
    if (stroke !== undefined) this.stroke = stroke;
    if (strokeWidth !== undefined) this.strokeWidth = parseNumber("stroke-width", strokeWidth);
  }
}

export function xmlEscape(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
