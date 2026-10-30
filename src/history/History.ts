import { SvgDocument } from "../model/SvgDocument.js";
import { SvgError } from "../model/SvgError.js";

/** 一条编辑命令的撤销单元：前后快照 + 两个方向的回显文案 */
export interface HistoryEntry {
  before: SvgDocument;
  after: SvgDocument;
  undoLine: string;
  redoLine: string;
}

/**
 * 撤销重做（Memento）：undo/redo 即快照切换。
 * 文档类命令（init/read/save、canvas 改尺寸）执行后加锁，
 * 直到下一条编辑命令重新解禁（规格 4.3）。
 */
export class History {
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];
  private lockedByIo = false;

  /** 编辑命令执行成功后调用：入撤销栈、清重做栈、解除 io 锁 */
  record(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    this.redoStack.length = 0;
    this.lockedByIo = false;
  }

  /** 文档类命令执行成功后调用 */
  lockByIo(): void {
    this.lockedByIo = true;
  }

  /** init/read 换文档后清空历史（旧文档的快照对新文档无意义） */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.lockedByIo = true;
  }

  undo(live: SvgDocument): string {
    if (this.lockedByIo) throw new SvgError("undo not allowed after io command");
    const entry = this.undoStack.pop();
    if (!entry) throw new SvgError("nothing to undo");
    live.restore(entry.before);
    this.redoStack.push(entry);
    return entry.undoLine;
  }

  redo(live: SvgDocument): string {
    if (this.lockedByIo) throw new SvgError("undo not allowed after io command");
    const entry = this.redoStack.pop();
    if (!entry) throw new SvgError("nothing to redo");
    live.restore(entry.after);
    this.undoStack.push(entry);
    return entry.redoLine;
  }
}
