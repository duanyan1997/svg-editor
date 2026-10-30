import { formatNumber, parseNumber, Position } from "./format.js";
import { SvgError } from "./SvgError.js";
import { Shape } from "./Shape.js";

const USAGE = "usage: create ellipse <id> <cx> <cy> <rx> <ry> [fill]";

export class Ellipse extends Shape {
  private cx: number;
  private cy: number;
  private rx: number;
  private ry: number;

  private constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id);
    this.cx = cx;
    this.cy = cy;
    this.rx = rx;
    this.ry = ry;
  }

  static fromArgs(id: string, params: string[]): Ellipse {
    if (params.length < 4 || params.length > 5) throw new SvgError(USAGE);
    const ellipse = new Ellipse(
      id,
      parseNumber("cx", params[0]!),
      parseNumber("cy", params[1]!),
      parseNumber("rx", params[2]!),
      parseNumber("ry", params[3]!),
    );
    const fill = params[4];
    if (fill !== undefined) ellipse.fill = fill;
    return ellipse;
  }

  static fromSvg(id: string, attrs: Record<string, string>): Ellipse {
    const ellipse = new Ellipse(
      id,
      attrs["cx"] !== undefined ? parseNumber("cx", attrs["cx"]) : 0,
      attrs["cy"] !== undefined ? parseNumber("cy", attrs["cy"]) : 0,
      attrs["rx"] !== undefined ? parseNumber("rx", attrs["rx"]) : 0,
      attrs["ry"] !== undefined ? parseNumber("ry", attrs["ry"]) : 0,
    );
    ellipse.applyPresentationAttrs(attrs);
    return ellipse;
  }

  get typeName(): string {
    return "ellipse";
  }

  translate(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  scaleBy(factor: number): void {
    this.cx *= factor;
    this.cy *= factor;
    this.rx *= factor;
    this.ry *= factor;
  }

  protected setGeometryAttr(name: string, value: string): void {
    switch (name) {
      case "cx":
        this.cx = parseNumber(name, value);
        break;
      case "cy":
        this.cy = parseNumber(name, value);
        break;
      case "rx":
        this.rx = parseNumber(name, value);
        break;
      case "ry":
        this.ry = parseNumber(name, value);
        break;
      default:
        throw new SvgError(`unknown attribute: ${name}`);
    }
  }

  geometrySummary(): string {
    return `cx=${formatNumber(this.cx)} cy=${formatNumber(this.cy)} rx=${formatNumber(this.rx)} ry=${formatNumber(this.ry)}`;
  }

  anchor(): Position {
    return { x: this.cx, y: this.cy };
  }

  serialize(out: string[], indent: number): void {
    const attrs = [
      this.presentationAttrs(),
      `cx="${formatNumber(this.cx)}"`,
      `cy="${formatNumber(this.cy)}"`,
      `rx="${formatNumber(this.rx)}"`,
      `ry="${formatNumber(this.ry)}"`,
    ].join(" ");
    out.push(`${"  ".repeat(indent)}<ellipse ${attrs}/>`);
  }

  clone(): Ellipse {
    const copy = new Ellipse(this.id, this.cx, this.cy, this.rx, this.ry);
    copy.copyPresentationFrom(this);
    return copy;
  }
}
