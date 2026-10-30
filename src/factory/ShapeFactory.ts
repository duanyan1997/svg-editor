import { Circle } from "../model/Circle.js";
import { Ellipse } from "../model/Ellipse.js";
import { Group } from "../model/Group.js";
import { Line } from "../model/Line.js";
import { Rect } from "../model/Rect.js";
import { Shape } from "../model/Shape.js";
import { SvgError } from "../model/SvgError.js";
import { TextElement } from "../model/TextElement.js";

/** CLI 参数 → 图形实例（每个图形类自带参数解析） */
export type CliBuilder = (id: string, params: string[]) => Shape;

/** SVG 属性 → 图形实例（read 路径） */
export type FileBuilder = (id: string, attrs: Record<string, string>, content: string) => Shape;

interface TypeDescriptor {
  cli?: CliBuilder;
  file?: FileBuilder;
}

/**
 * 图形工厂：类型名 → 类的唯一按名分派点（架构方案标注为待重构）。
 * 阶段2的 ShapeProvider 插件（box 等）在此注册，内核其余代码不出现类型分支。
 */
export class ShapeFactory {
  private readonly types = new Map<string, TypeDescriptor>();

  registerType(name: string, descriptor: TypeDescriptor): void {
    this.types.set(name, descriptor);
  }

  createFromCli(type: string, id: string, params: string[]): Shape {
    const descriptor = this.types.get(type);
    const build = descriptor?.cli;
    if (!build) throw new SvgError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return build(id, params);
  }

  /** 读入未知元素返回 null（调用方决定降级策略），与 CLI 路径的硬错误区分 */
  createFromFile(type: string, id: string, attrs: Record<string, string>, content: string): Shape | null {
    const build = this.types.get(type)?.file;
    if (!build) return null;
    return build(id, attrs, content);
  }
}

/** 内核内置六种类型（box 等复合类型留给插件化阶段注册） */
export function createDefaultShapeFactory(): ShapeFactory {
  const factory = new ShapeFactory();
  factory.registerType("rect", { cli: Rect.fromArgs, file: Rect.fromSvg });
  factory.registerType("circle", { cli: Circle.fromArgs, file: Circle.fromSvg });
  factory.registerType("ellipse", { cli: Ellipse.fromArgs, file: Ellipse.fromSvg });
  factory.registerType("line", { cli: Line.fromArgs, file: Line.fromSvg });
  factory.registerType("text", { cli: TextElement.fromArgs, file: TextElement.fromSvg });
  factory.registerType("g", { cli: (id) => new Group(id), file: Group.fromSvg });
  return factory;
}
