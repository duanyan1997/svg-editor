import { formatNumber, parseNumber, Position } from "./format.js";
import { SvgError } from "./SvgError.js";
import { Shape } from "./Shape.js";

const USAGE = "usage: create line <id> <x1> <y1> <x2> <y2> [stroke]";

export class Line extends Shape {
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;

  private constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  static fromArgs(id: string, params: string[]): Line {
    if (params.length < 4 || params.length > 5) throw new SvgError(USAGE);
    const line = new Line(
      id,
      parseNumber("x1", params[0]!),
      parseNumber("y1", params[1]!),
      parseNumber("x2", params[2]!),
      parseNumber("y2", params[3]!),
    );
    const stroke = params[4];
    if (stroke !== undefined) line.stroke = stroke;
    return line;
  }

  static fromSvg(id: string, attrs: Record<string, string>): Line {
    const line = new Line(
      id,
      attrs["x1"] !== undefined ? parseNumber("x1", attrs["x1"]) : 0,
      attrs["y1"] !== undefined ? parseNumber("y1", attrs["y1"]) : 0,
      attrs["x2"] !== undefined ? parseNumber("x2", attrs["x2"]) : 0,
      attrs["y2"] !== undefined ? parseNumber("y2", attrs["y2"]) : 0,
    );
    line.applyPresentationAttrs(attrs);
    return line;
  }

  get typeName(): string {
    return "line";
  }

  translate(dx: number, dy: number): void {
    this.x1 += dx;
    this.y1 += dy;
    this.x2 += dx;
    this.y2 += dy;
  }

  scaleBy(factor: number): void {
    this.x1 *= factor;
    this.y1 *= factor;
    this.x2 *= factor;
    this.y2 *= factor;
  }

  protected setGeometryAttr(name: string, value: string): void {
    switch (name) {
      case "x1":
        this.x1 = parseNumber(name, value);
        break;
      case "y1":
        this.y1 = parseNumber(name, value);
        break;
      case "x2":
        this.x2 = parseNumber(name, value);
        break;
      case "y2":
        this.y2 = parseNumber(name, value);
        break;
      default:
        throw new SvgError(`unknown attribute: ${name}`);
    }
  }

  protected geometryAttr(name: string): string | undefined {
    switch (name) {
      case "x1":
        return formatNumber(this.x1);
      case "y1":
        return formatNumber(this.y1);
      case "x2":
        return formatNumber(this.x2);
      case "y2":
        return formatNumber(this.y2);
      default:
        return undefined;
    }
  }

  /** tree / show 用线段两端表达 */
  geometrySummary(): string {
    return `(${formatNumber(this.x1)},${formatNumber(this.y1)}) -> (${formatNumber(this.x2)},${formatNumber(this.y2)})`;
  }

  anchor(): Position {
    return { x: this.x1, y: this.y1 };
  }

  serialize(out: string[], indent: number): void {
    const attrs = [
      this.presentationAttrs(),
      `x1="${formatNumber(this.x1)}"`,
      `y1="${formatNumber(this.y1)}"`,
      `x2="${formatNumber(this.x2)}"`,
      `y2="${formatNumber(this.y2)}"`,
    ].join(" ");
    out.push(`${"  ".repeat(indent)}<line ${attrs}/>`);
  }

  clone(): Line {
    const copy = new Line(this.id, this.x1, this.y1, this.x2, this.y2);
    copy.copyPresentationFrom(this);
    return copy;
  }
}
