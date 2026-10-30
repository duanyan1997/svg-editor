import { describe, expect, it } from "vitest";

import { createDefaultShapeFactory } from "../../src/factory/ShapeFactory.js";
import { Group } from "../../src/model/Group.js";
import { SvgDocument } from "../../src/model/SvgDocument.js";
import { TextElement } from "../../src/model/TextElement.js";

function buildDoc(): SvgDocument {
  const factory = createDefaultShapeFactory();
  const doc = new SvgDocument(800, 600);
  doc.insert(factory.createFromCli("rect", "bg", ["0", "0", "800", "600", "#ffffff"]), null);
  doc.insert(factory.createFromCli("text", "title", ["20", "40", "My Diagram"]), null);
  const group = factory.createFromCli("g", "markers", []) as Group;
  doc.insert(group, null);
  doc.insert(factory.createFromCli("circle", "c1", ["100", "100", "20", "red"]), group);
  doc.insert(factory.createFromCli("rect", "box", ["200", "80", "60", "60", "#3366ff"]), group);
  return doc;
}

describe("图形变换", () => {
  const factory = createDefaultShapeFactory();

  it("叶子 translate 平移几何", () => {
    const rect = factory.createFromCli("rect", "r1", ["10", "20", "100", "50"]);
    rect.translate(30, -5);
    expect(rect.geometrySummary()).toBe("x=40 y=15 w=100 h=50");
    expect(rect.anchor()).toEqual({ x: 40, y: 15 });
  });

  it("叶子 scaleBy 同乘位置与尺寸", () => {
    const circle = factory.createFromCli("circle", "c1", ["100", "100", "20"]);
    circle.scaleBy(0.5);
    expect(circle.geometrySummary()).toBe("cx=50 cy=50 r=10");
  });

  it("容器变换递归到全部子孙", () => {
    const doc = buildDoc();
    const markers = doc.require("markers");
    markers.translate(10, 20);
    expect(doc.require("c1").anchor()).toEqual({ x: 110, y: 120 });
    expect(doc.require("box").anchor()).toEqual({ x: 210, y: 100 });
    markers.scaleBy(2);
    expect(doc.require("c1").anchor()).toEqual({ x: 220, y: 240 });
  });

  it("text 只缩放位置不缩放内容", () => {
    const text = factory.createFromCli("text", "t1", ["10", "20", "hi"]);
    text.scaleBy(3);
    expect(text.geometrySummary()).toBe('(30,60) "hi"');
  });
});

describe("set 属性白名单", () => {
  const factory = createDefaultShapeFactory();

  it("公共属性与几何属性均可设置", () => {
    const rect = factory.createFromCli("rect", "r1", ["0", "0", "10", "10"]);
    rect.setAttr("fill", "#123456");
    rect.setAttr("width", "99");
    rect.setAttr("stroke-width", "2.5");
    expect(rect.geometrySummary()).toBe("x=0 y=0 w=99 h=10");
    expect(rect.presentationSummary()).toBe("fill=#123456 stroke-width=2.5");
  });

  it("text 内容可改写", () => {
    const text = factory.createFromCli("text", "t1", ["1", "2", "old"]);
    text.setAttr("text", "new value");
    expect((text as TextElement).getText()).toBe("new value");
  });

  it("白名单外报未知属性", () => {
    const rect = factory.createFromCli("rect", "r1", ["0", "0", "10", "10"]);
    expect(() => rect.setAttr("opacity", "0.5")).toThrowError("unknown attribute: opacity");
    const group = new Group("g1");
    expect(() => group.setAttr("x", "1")).toThrowError("unknown attribute: x");
  });

  it("stroke-width 非数字报错", () => {
    const rect = factory.createFromCli("rect", "r1", ["0", "0", "10", "10"]);
    expect(() => rect.setAttr("stroke-width", "abc")).toThrowError("invalid number: abc");
  });
});

describe("序列化", () => {
  const factory = createDefaultShapeFactory();

  it("省略 fill 时不写入该属性", () => {
    const rect = factory.createFromCli("rect", "r1", ["1", "2", "3", "4"]);
    const out: string[] = [];
    rect.serialize(out, 0);
    expect(out[0]).toBe('<rect id="r1" x="1" y="2" width="3" height="4"/>');
  });

  it("text 内容做 XML 转义", () => {
    const text = factory.createFromCli("text", "t1", ["1", "2", 'a<b & "c"']);
    const out: string[] = [];
    text.serialize(out, 1);
    expect(out[0]).toBe('  <text id="t1" x="1" y="2">a&lt;b &amp; &quot;c&quot;</text>');
  });

  it("空容器序列化为自闭合 g", () => {
    const group = new Group("scene");
    const out: string[] = [];
    group.serialize(out, 0);
    expect(out[0]).toBe('<g id="scene"/>');
  });

  it("嵌套容器带缩进输出", () => {
    const doc = buildDoc();
    const out: string[] = [];
    (doc.require("markers") as Group).serialize(out, 0);
    expect(out).toEqual([
      '<g id="markers">',
      '  <circle id="c1" fill="red" cx="100" cy="100" r="20"/>',
      '  <rect id="box" fill="#3366ff" x="200" y="80" width="60" height="60"/>',
      "</g>",
    ]);
  });
});

describe("clone 深拷贝", () => {
  it("克隆后修改副本不影响原件", () => {
    const doc = buildDoc();
    const snap = doc.snapshot();

    snap.require("c1").translate(50, 0);
    (snap.require("markers") as Group).setAttr("fill", "blue");

    expect(doc.require("c1").anchor()).toEqual({ x: 100, y: 100 });
    expect(doc.require("markers").presentationSummary()).toBe("");
    expect(snap.require("c1").anchor()).toEqual({ x: 150, y: 100 });
  });

  it("克隆的容器子树 parent 指向副本", () => {
    const doc = buildDoc();
    const snap = doc.snapshot();
    const markers = snap.require("markers") as Group;
    const c1 = snap.require("c1");
    expect(c1.parent).toBe(markers);
    expect(markers.childCount()).toBe(2);
  });
});
