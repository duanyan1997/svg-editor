import { describe, expect, it } from "vitest";

import { createDefaultShapeFactory, ShapeFactory } from "../../src/factory/ShapeFactory.js";
import { Group } from "../../src/model/Group.js";
import { TextElement } from "../../src/model/TextElement.js";

describe("ShapeFactory（CLI 参数路径）", () => {
  const factory = createDefaultShapeFactory();

  it("按类型名创建六种内置图形", () => {
    expect(factory.createFromCli("rect", "r1", ["0", "0", "10", "20"]).typeName).toBe("rect");
    expect(factory.createFromCli("circle", "c1", ["1", "2", "3"]).typeName).toBe("circle");
    expect(factory.createFromCli("ellipse", "e1", ["1", "2", "3", "4"]).typeName).toBe("ellipse");
    expect(factory.createFromCli("line", "l1", ["0", "0", "1", "1"]).typeName).toBe("line");
    expect(factory.createFromCli("text", "t1", ["5", "6", "hi"]).typeName).toBe("text");
    expect(factory.createFromCli("g", "g1", []).typeName).toBe("g");
  });

  it("参数缺多报 usage", () => {
    expect(() => factory.createFromCli("rect", "r1", ["0", "0", "10"])).toThrowError(
      "usage: create rect <id> <x> <y> <w> <h> [fill]",
    );
    expect(() => factory.createFromCli("text", "t1", ["1", "2"])).toThrowError(
      'usage: create text <id> <x> <y> "content"',
    );
  });

  it("非数字参数报 invalid number", () => {
    expect(() => factory.createFromCli("circle", "c1", ["1", "abc", "3"])).toThrowError(
      "invalid number: abc",
    );
  });

  it("未注册类型按插件语义报错（box 属插件化阶段）", () => {
    expect(() => factory.createFromCli("box", "b1", [])).toThrowError(
      "unknown shape type: box (is the plugin loaded?)",
    );
    expect(() => factory.createFromCli("hexagon", "h1", [])).toThrowError(
      "unknown shape type: hexagon (is the plugin loaded?)",
    );
  });

  it("自定义工厂可注册插件类型（插槽验证）", () => {
    const custom = new ShapeFactory();
    custom.registerType("box", { cli: (id) => new Group(id) });
    expect(custom.createFromCli("box", "b1", []).typeName).toBe("g");
  });
});

describe("ShapeFactory（SVG 读入路径）", () => {
  const factory = createDefaultShapeFactory();

  it("按属性装配图形", () => {
    const rect = factory.createFromFile("rect", "r1", {
      x: "10",
      y: "20",
      width: "100",
      height: "50",
      fill: "#eee",
    }, "");
    expect(rect).not.toBeNull();
    expect(rect!.geometrySummary()).toBe("x=10 y=20 w=100 h=50");
    expect(rect!.presentationSummary()).toBe("fill=#eee");
  });

  it("缺省几何属性落 0", () => {
    const rect = factory.createFromFile("rect", "r1", {}, "");
    expect(rect).not.toBeNull();
    expect(rect!.geometrySummary()).toBe("x=0 y=0 w=0 h=0");
  });

  it("未注册类型返回 null（降级交给调用方）", () => {
    expect(factory.createFromFile("polygon", "p1", {}, "")).toBeNull();
  });

  it("text 装配子文本内容", () => {
    const text = factory.createFromFile("text", "t1", { x: "1", y: "2" }, "hello");
    expect(text).toBeInstanceOf(TextElement);
    expect((text as TextElement).getText()).toBe("hello");
  });

  it("g 装配公共属性", () => {
    const group = factory.createFromFile("g", "g1", { fill: "red" }, "");
    expect(group).toBeInstanceOf(Group);
    expect(group?.presentationSummary()).toBe("fill=red");
  });
});
