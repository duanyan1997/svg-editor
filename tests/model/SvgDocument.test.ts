import { describe, expect, it } from "vitest";

import { createDefaultShapeFactory } from "../../src/factory/ShapeFactory.js";
import { Group } from "../../src/model/Group.js";
import { SvgDocument } from "../../src/model/SvgDocument.js";
import { SvgError } from "../../src/model/SvgError.js";

function newDoc(): SvgDocument {
  return new SvgDocument(800, 600);
}

describe("id 索引与查找", () => {
  const factory = createDefaultShapeFactory();

  it("重复 id 报错且不改变状态", () => {
    const doc = newDoc();
    doc.insert(factory.createFromCli("rect", "r1", ["0", "0", "1", "1"]), null);
    expect(() =>
      doc.insert(factory.createFromCli("circle", "r1", ["0", "0", "1"]), null),
    ).toThrowError("id already exists: r1");
    expect(doc.elementCount()).toBe(1);
    expect(doc.findById("r1")?.typeName).toBe("rect");
  });

  it("嵌套挂载后子孙可按 id 查到", () => {
    const doc = newDoc();
    const group = factory.createFromCli("g", "g1", []) as Group;
    doc.insert(group, null);
    doc.insert(factory.createFromCli("circle", "c1", ["0", "0", "5"]), group);
    expect(doc.elementCount()).toBe(2);
    expect(doc.findById("c1")?.parent).toBe(group);
  });

  it("require 缺失 id 报 no such shape", () => {
    expect(() => newDoc().require("ghost")).toThrowError("no such shape: ghost");
  });
});

describe("detach 摘除", () => {
  const factory = createDefaultShapeFactory();

  it("摘除容器时索引清理全部子孙", () => {
    const doc = newDoc();
    const group = factory.createFromCli("g", "g1", []) as Group;
    doc.insert(group, null);
    doc.insert(factory.createFromCli("circle", "c1", ["0", "0", "5"]), group);
    doc.detach(group);
    expect(doc.elementCount()).toBe(0);
    expect(doc.findById("c1")).toBeNull();
    expect(doc.topLevels().length).toBe(0);
  });
});

describe("z-order 重排", () => {
  const factory = createDefaultShapeFactory();

  it("front/back 调整顶层顺序", () => {
    const doc = newDoc();
    doc.insert(factory.createFromCli("rect", "a", ["0", "0", "1", "1"]), null);
    doc.insert(factory.createFromCli("rect", "b", ["0", "0", "1", "1"]), null);
    doc.insert(factory.createFromCli("rect", "c", ["0", "0", "1", "1"]), null);

    doc.moveToFront(doc.require("a"));
    expect(doc.topLevels().map((s) => s.id)).toEqual(["b", "c", "a"]);
    doc.moveToBack(doc.require("c"));
    expect(doc.topLevels().map((s) => s.id)).toEqual(["c", "b", "a"]);
  });

  it("front/back 在容器内部同样生效", () => {
    const doc = newDoc();
    const group = factory.createFromCli("g", "g1", []) as Group;
    doc.insert(group, null);
    doc.insert(factory.createFromCli("rect", "a", ["0", "0", "1", "1"]), group);
    doc.insert(factory.createFromCli("rect", "b", ["0", "0", "1", "1"]), group);

    doc.moveToBack(doc.require("b"));
    expect(group.getChildren().map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("快照与恢复（Memento）", () => {
  const factory = createDefaultShapeFactory();

  it("restore 后树与画布回到快照状态，且快照可反复使用", () => {
    const doc = newDoc();
    const group = factory.createFromCli("g", "g1", []) as Group;
    doc.insert(group, null);
    doc.insert(factory.createFromCli("rect", "r1", ["0", "0", "1", "1"]), group);

    const snap = doc.snapshot();
    // 破坏性变更：删容器、改画布、加新图形
    doc.detach(group);
    doc.resize(100, 100);
    doc.insert(factory.createFromCli("circle", "c2", ["0", "0", "1"]), null);

    doc.restore(snap);
    expect(doc.width).toBe(800);
    expect(doc.elementCount()).toBe(2);
    expect(doc.findById("r1")?.parent).toBe(doc.require("g1"));

    // 第二次 restore：快照未被上次恢复消耗
    doc.restore(snap);
    expect(doc.elementCount()).toBe(2);
    expect(doc.findById("r1")?.parent).toBe(doc.require("g1"));
  });

  it("快照记录并还原文档来源路径", () => {
    const doc = newDoc();
    doc.setSourcePath("a.svg");
    const snap = doc.snapshot();
    doc.setSourcePath("b.svg");
    doc.restore(snap);
    expect(doc.sourcePath).toBe("a.svg");
  });
});

describe("画布", () => {
  it("默认 800x600", () => {
    expect(newDoc().width).toBe(800);
    expect(newDoc().height).toBe(600);
  });
});
