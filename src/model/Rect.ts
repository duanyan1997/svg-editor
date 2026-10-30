import { formatNumber, parseNumber, Position } from "./format.js";
import { SvgError } from "./SvgError.js";
import { Shape } from "./Shape.js";

const USAGE = "usage: create rect <id> <x> <y> <w> <h> [fill]";

export class Rect extends Shape {
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  private constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  static fromArgs(id: string, params: string[]): Rect {
    if (params.length < 4 || params.length > 5) throw new SvgError(USAGE);
    const rect = new Rect(
      id,
      parseNumber("x", params[0]!),
      parseNumber("y", params[1]!),
      parseNumber("width", params[2]!),
      parseNumber("height", params[3]!),
    );
    const fill = params[4];
    if (fill !== undefined) rect.fill = fill;
    return rect;
  }

  static fromSvg(id: string, attrs: Record<string, string>): Rect {
    const rect = new Rect(
      id,
      attrs["x"] !== undefined ? parseNumber("x", attrs["x"]) : 0,
      attrs["y"] !== undefined ? parseNumber("y", attrs["y"]) : 0,
      attrs["width"] !== undefined ? parseNumber("width", attrs["width"]) : 0,
      attrs["height"] !== undefined ? parseNumber("height", attrs["height"]) : 0,
    );
    rect.applyPresentationAttrs(attrs);
    return rect;
  }

  get typeName(): string {
    return "rect";
  }

  translate(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  scaleBy(factor: number): void {
    this.x *= factor;
    this.y *= factor;
    this.width *= factor;
    this.height *= factor;
  }

  protected setGeometryAttr(name: string, value: string): void {
    switch (name) {
      case "x":
        this.x = parseNumber(name, value);
        break;
      case "y":
        this.y = parseNumber(name, value);
        break;
      case "width":
        this.width = parseNumber(name, value);
        break;
      case "height":
        this.height = parseNumber(name, value);
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
      case "width":
        return formatNumber(this.width);
      case "height":
        return formatNumber(this.height);
      default:
        return undefined;
    }
  }

  geometrySummary(): string {
    return `x=${formatNumber(this.x)} y=${formatNumber(this.y)} w=${formatNumber(this.width)} h=${formatNumber(this.height)}`;
  }

  anchor(): Position {
    return { x: this.x, y: this.y };
  }

  serialize(out: string[], indent: number): void {
    const attrs = [
      this.presentationAttrs(),
      `x="${formatNumber(this.x)}"`,
      `y="${formatNumber(this.y)}"`,
      `width="${formatNumber(this.width)}"`,
      `height="${formatNumber(this.height)}"`,
    ].join(" ");
    out.push(`${"  ".repeat(indent)}<rect ${attrs}/>`);
  }

  clone(): Rect {
    const copy = new Rect(this.id, this.x, this.y, this.width, this.height);
    copy.copyPresentationFrom(this);
    return copy;
  }
}
