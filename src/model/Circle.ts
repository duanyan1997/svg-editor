import { formatNumber, parseNumber, Position } from "./format.js";
import { SvgError } from "./SvgError.js";
import { Shape } from "./Shape.js";

const USAGE = "usage: create circle <id> <cx> <cy> <r> [fill]";

export class Circle extends Shape {
  private cx: number;
  private cy: number;
  private r: number;

  private constructor(id: string, cx: number, cy: number, r: number) {
    super(id);
    this.cx = cx;
    this.cy = cy;
    this.r = r;
  }

  static fromArgs(id: string, params: string[]): Circle {
    if (params.length < 3 || params.length > 4) throw new SvgError(USAGE);
    const circle = new Circle(
      id,
      parseNumber("cx", params[0]!),
      parseNumber("cy", params[1]!),
      parseNumber("r", params[2]!),
    );
    const fill = params[3];
    if (fill !== undefined) circle.fill = fill;
    return circle;
  }

  static fromSvg(id: string, attrs: Record<string, string>): Circle {
    const circle = new Circle(
      id,
      attrs["cx"] !== undefined ? parseNumber("cx", attrs["cx"]) : 0,
      attrs["cy"] !== undefined ? parseNumber("cy", attrs["cy"]) : 0,
      attrs["r"] !== undefined ? parseNumber("r", attrs["r"]) : 0,
    );
    circle.applyPresentationAttrs(attrs);
    return circle;
  }

  get typeName(): string {
    return "circle";
  }

  translate(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  scaleBy(factor: number): void {
    this.cx *= factor;
    this.cy *= factor;
    this.r *= factor;
  }

  protected setGeometryAttr(name: string, value: string): void {
    switch (name) {
      case "cx":
        this.cx = parseNumber(name, value);
        break;
      case "cy":
        this.cy = parseNumber(name, value);
        break;
      case "r":
        this.r = parseNumber(name, value);
        break;
      default:
        throw new SvgError(`unknown attribute: ${name}`);
    }
  }

  geometrySummary(): string {
    return `cx=${formatNumber(this.cx)} cy=${formatNumber(this.cy)} r=${formatNumber(this.r)}`;
  }

  anchor(): Position {
    return { x: this.cx, y: this.cy };
  }

  serialize(out: string[], indent: number): void {
    const attrs = [
      this.presentationAttrs(),
      `cx="${formatNumber(this.cx)}"`,
      `cy="${formatNumber(this.cy)}"`,
      `r="${formatNumber(this.r)}"`,
    ].join(" ");
    out.push(`${"  ".repeat(indent)}<circle ${attrs}/>`);
  }

  clone(): Circle {
    const copy = new Circle(this.id, this.cx, this.cy, this.r);
    copy.copyPresentationFrom(this);
    return copy;
  }
}
