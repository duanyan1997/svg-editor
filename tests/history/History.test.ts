import { describe, expect, it } from "vitest";

import { History } from "../../src/history/History.js";
import { SvgError } from "../../src/model/SvgError.js";
import { SvgDocument } from "../../src/model/SvgDocument.js";

function makePair(): { live: SvgDocument; before: SvgDocument; after: SvgDocument } {
  const live = new SvgDocument();
  return { live, before: live.snapshot(), after: live.snapshot() };
}

describe("History（undo/redo 与 io 锁）", () => {
  it("空栈 undo/redo 报错", () => {
    const history = new History();
    const { live } = makePair();
    expect(() => history.undo(live)).toThrowError("nothing to undo");
    expect(() => history.redo(live)).toThrowError("nothing to redo");
  });

  it("record 后可 undo；undo 后可 redo；redo 恢复 after 快照", () => {
    const history = new History();
    const { live, before, after } = makePair();
    before.resize(100, 100);
    after.resize(200, 200);
    history.record({ before, after, undoLine: "u", redoLine: "r" });

    expect(history.undo(live)).toBe("u");
    expect(live.width).toBe(100);
    expect(history.redo(live)).toBe("r");
    expect(live.width).toBe(200);
  });

  it("undo 后若有新编辑，redo 栈清空", () => {
    const history = new History();
    const { live, before, after } = makePair();
    history.record({ before, after, undoLine: "u1", redoLine: "r1" });
    history.undo(live);

    // 新编辑入栈 → redo 机会消失
    history.record({ before: live.snapshot(), after: live.snapshot(), undoLine: "u2", redoLine: "r2" });
    expect(() => history.redo(live)).toThrowError("nothing to redo");
    expect(history.undo(live)).toBe("u2");
  });

  it("同一 entry 可被多次 undo/redo 往返（快照不被消耗）", () => {
    const history = new History();
    const { live, before, after } = makePair();
    before.resize(1, 1);
    after.resize(2, 2);
    history.record({ before, after, undoLine: "u", redoLine: "r" });

    for (let i = 0; i < 3; i++) {
      expect(history.undo(live)).toBe("u");
      expect(live.width).toBe(1);
      expect(history.redo(live)).toBe("r");
      expect(live.width).toBe(2);
    }
  });

  it("io 锁定后 undo/redo 都被拒；编辑命令重新解禁", () => {
    const history = new History();
    const { live, before, after } = makePair();
    history.record({ before, after, undoLine: "u", redoLine: "r" });

    history.lockByIo();
    expect(() => history.undo(live)).toThrowError("undo not allowed after io command");
    expect(() => history.redo(live)).toThrowError("undo not allowed after io command");

    history.record({ before: live.snapshot(), after: live.snapshot(), undoLine: "", redoLine: "" });
    expect(() => history.undo(live)).not.toThrowError();
  });

  it("clear 清空栈并锁定（换文档场景）", () => {
    const history = new History();
    const { live, before, after } = makePair();
    history.record({ before, after, undoLine: "u", redoLine: "r" });
    history.clear();
    expect(() => history.undo(live)).toThrowError("undo not allowed after io command");
  });

  it("领域错误类型为 SvgError", () => {
    const history = new History();
    const { live } = makePair();
    expect(() => history.undo(live)).toThrowError(SvgError);
  });
});
