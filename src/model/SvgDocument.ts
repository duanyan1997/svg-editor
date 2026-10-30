import { Group } from "./Group.js";
import { Shape } from "./Shape.js";
import { SvgError } from "./SvgError.js";

/**
 * 文档聚合根：画布尺寸 + 图形树 + id 索引。
 * 一切结构性变更（挂载/摘除/重排）必须经此完成，保证 id 索引与父子指针一致；
 * 撤销重做的快照/恢复也以整文档为单位（Memento）。
 */
export class SvgDocument {
  private _width: number;
  private _height: number;
  private _sourcePath: string | null = null;

  private readonly roots: Shape[] = [];
  private readonly ids = new Map<string, Shape>();

  constructor(width = 800, height = 600) {
    this._width = width;
    this._height = height;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get sourcePath(): string | null {
    return this._sourcePath;
  }

  setSourcePath(path: string | null): void {
    this._sourcePath = path;
  }

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
  }

  topLevels(): readonly Shape[] {
    return this.roots;
  }

  findById(id: string): Shape | null {
    return this.ids.get(id) ?? null;
  }

  /** 定位图形，缺失即抛 "no such shape" */
  require(id: string): Shape {
    const shape = this.ids.get(id);
    if (!shape) throw new SvgError(`no such shape: ${id}`);
    return shape;
  }

  /** 文档内图形元素总数（含容器，不含根 <svg>） */
  elementCount(): number {
    return this.ids.size;
  }

  /** 挂载到指定父容器（null = 顶层）；id 唯一性先于任何状态变更校验 */
  insert(shape: Shape, parent: Group | null, index = Number.POSITIVE_INFINITY): void {
    if (this.ids.has(shape.id)) throw new SvgError(`id already exists: ${shape.id}`);
    if (parent) {
      parent.insertChild(index, shape);
    } else {
      const at = Math.min(index, this.roots.length);
      this.roots.splice(at, 0, shape);
    }
    this.indexSubtree(shape);
  }

  /** 摘除图形（容器连同全部子孙），索引同步清理 */
  detach(shape: Shape): void {
    if (shape.parent) {
      shape.parent.removeChild(shape);
    } else {
      const at = this.roots.indexOf(shape);
      if (at >= 0) this.roots.splice(at, 1);
    }
    this.unindexSubtree(shape);
  }

  /** 同级 z-order：最前 = 渲染最上层 = 兄弟列表末尾（SVG 后画者在上） */
  moveToFront(shape: Shape): void {
    const parent = shape.parent;
    if (parent) {
      parent.removeChild(shape);
      parent.insertChild(Number.POSITIVE_INFINITY, shape);
    } else {
      const at = this.roots.indexOf(shape);
      if (at >= 0) {
        this.roots.splice(at, 1);
        this.roots.push(shape);
      }
    }
  }

  moveToBack(shape: Shape): void {
    const parent = shape.parent;
    if (parent) {
      parent.removeChild(shape);
      parent.insertChild(0, shape);
    } else {
      const at = this.roots.indexOf(shape);
      if (at >= 0) {
        this.roots.splice(at, 1);
        this.roots.unshift(shape);
      }
    }
  }

  /** 撤销重做（Memento）：快照=整文档深拷贝 */
  snapshot(): SvgDocument {
    const snap = new SvgDocument(this._width, this._height);
    snap._sourcePath = this._sourcePath;
    for (const root of this.roots) snap.insert(root.clone(), null);
    return snap;
  }

  /** 恢复自快照：克隆挂载，保证快照本体可被 undo/redo 反复使用 */
  restore(snap: SvgDocument): void {
    this._width = snap._width;
    this._height = snap._height;
    this._sourcePath = snap._sourcePath;
    this.roots.length = 0;
    this.ids.clear();
    for (const root of snap.roots) this.insert(root.clone(), null);
  }

  private indexSubtree(shape: Shape): void {
    if (this.ids.has(shape.id)) throw new SvgError(`id already exists: ${shape.id}`);
    this.ids.set(shape.id, shape);
    if (shape instanceof Group) {
      for (const child of shape.getChildren()) this.indexSubtree(child);
    }
  }

  private unindexSubtree(shape: Shape): void {
    this.ids.delete(shape.id);
    if (shape instanceof Group) {
      for (const child of shape.getChildren()) this.unindexSubtree(child);
    }
  }
}
