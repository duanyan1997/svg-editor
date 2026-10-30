import { formatNumber, parseNumber, Position } from "./format.js";
import { SvgError } from "./SvgError.js";
import { Shape, xmlEscape } from "./Shape.js";

const USAGE = 'usage: create text <id> <x> <y> "content"';

export class TextElement extends Shape {
  private x: number;
  private y: number;
  private content: string;

  private constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.x = x;
    this.y = y;
    this.content = content;
  }

  static fromArgs(id: string, params: string[]): TextElement {
    if (params.length !== 3) throw new SvgError(USAGE);
    return new TextElement(
      id,
      parseNumber("x", params[0]!),
      parseNumber("y", params[1]!),
      params[2]!,
    );
  }

  static fromSvg(id: string, attrs: Record<string, string>, content: string): TextElement {
    const text = new TextElement(
      id,
      attrs["x"] !== undefined ? parseNumber("x", attrs["x"]) : 0,
      attrs["y"] !== undefined ? parseNumber("y", attrs["y"]) : 0,
      content,
    );
    text.applyPresentationAttrs(attrs);
    return text;
  }

  get typeName(): string {
    return "text";
  }

  getText(): string {
    return this.content;
  }

  translate(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  /** 文本无尺寸属性，只缩放位置 */
  scaleBy(factor: number): void {
    this.x *= factor;
    this.y *= factor;
  }

  protected setGeometryAttr(name: string, value: string): void {
    switch (name) {
      case "x":
        this.x = parseNumber(name, value);
        break;
      case "y":
        this.y = parseNumber(name, value);
        break;
      case "text":
        this.content = value;
        break;
      default:
        throw new SvgError(`unknown attribute: ${name}`);
    }
  }

  protected geometryAttr(name: string): string | undefined {
    switch (name) {
      case "x":
        return formatNumber(this.x);
      case "y":
        return formatNumber(this.y);
      case "text":
        return this.content;
      default:
        return undefined;
    }
  }

  geometrySummary(): string {
    return `(${formatNumber(this.x)},${formatNumber(this.y)}) "${this.content}"`;
  }

  anchor(): Position {
    return { x: this.x, y: this.y };
  }

  /** <text> 的内容是子文本而非属性 */
  serialize(out: string[], indent: number): void {
    const attrs = [
      this.presentationAttrs(),
      `x="${formatNumber(this.x)}"`,
      `y="${formatNumber(this.y)}"`,
    ].join(" ");
    out.push(`${"  ".repeat(indent)}<text ${attrs}>${xmlEscape(this.content)}</text>`);
  }

  clone(): TextElement {
    const copy = new TextElement(this.id, this.x, this.y, this.content);
    copy.copyPresentationFrom(this);
    return copy;
  }
}
