import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDefaultShapeFactory } from "../../src/factory/ShapeFactory.js";
import { SvgReader } from "../../src/io/SvgReader.js";
import { SvgWriter } from "../../src/io/SvgWriter.js";
import { Group } from "../../src/model/Group.js";
import { SvgDocument } from "../../src/model/SvgDocument.js";

let tmpDir: string;
const factory = createDefaultShapeFactory();

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "svg-editor-io-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const OTHER_SVG = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
  '  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>',
  '  <text id="t1" x="10" y="290">imported</text>',
  '  <circle id="c1" cx="50" cy="50" r="10"/>',
  "  <g id=\"g1\">",
    '    <rect id="r2" x="0" y="0" width="10" height="10"/>',
    '    <circle id="c2" cx="5" cy="5" r="2"/>',
  "  </g>",
  '  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>',
  "</svg>",
].join("\n");

describe("SvgReader", () => {
  it("读入规格 6 的 other.svg：计数、结构与缺 id 警告", () => {
    const file = path.join(tmpDir, "other.svg");
    fs.writeFileSync(file, OTHER_SVG, "utf8");
    const { document, warnings } = new SvgReader(factory).read(file);

    expect(document.width).toBe(400);
    expect(document.height).toBe(300);
    expect(document.elementCount()).toBe(7);
    expect(warnings).toEqual(["warning: assigned id rect1 to unnamed <rect>"]);
    expect(document.findById("rect1")?.geometrySummary()).toBe("x=0 y=0 w=400 h=300");
    expect(document.findById("rect1")?.presentationSummary()).toBe("fill=#ffffff");
    expect(document.findById("c1")?.parent).toBeNull();
    expect(document.findById("c2")?.parent).toBe(document.findById("g1"));
  });

  it("画布尺寸取自 viewBox（无 width/height 时）", () => {
    const file = path.join(tmpDir, "vb.svg");
    fs.writeFileSync(
      file,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"></svg>',
      "utf8",
    );
    const { document } = new SvgReader(factory).read(file);
    expect(document.width).toBe(640);
    expect(document.height).toBe(480);
  });

  it("width 容忍单位后缀（400px）", () => {
    const file = path.join(tmpDir, "px.svg");
    fs.writeFileSync(
      file,
      '<svg xmlns="http://www.w3.org/2000/svg" width="400px" height="200px"></svg>',
      "utf8",
    );
    const { document } = new SvgReader(factory).read(file);
    expect(document.width).toBe(400);
    expect(document.height).toBe(200);
  });

  it("多个缺 id 元素按序自动补 id", () => {
    const file = path.join(tmpDir, "multi.svg");
    fs.writeFileSync(
      file,
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">',
        "  <rect width=\"1\" height=\"1\"/>",
        "  <circle r=\"1\"/>",
        "</svg>",
      ].join("\n"),
      "utf8",
    );
    const { document, warnings } = new SvgReader(factory).read(file);
    expect(warnings).toEqual([
      "warning: assigned id rect1 to unnamed <rect>",
      "warning: assigned id circle1 to unnamed <circle>",
    ]);
    expect(document.findById("rect1")).not.toBeNull();
    expect(document.findById("circle1")).not.toBeNull();
  });

  it("自动补 id 避开文件中已有的同名 id", () => {
    const file = path.join(tmpDir, "clash.svg");
    fs.writeFileSync(
      file,
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">',
        '  <rect id="rect1" width="1" height="1"/>',
        '  <rect width="2" height="2"/>',
        "</svg>",
      ].join("\n"),
      "utf8",
    );
    const { warnings } = new SvgReader(factory).read(file);
    expect(warnings).toEqual(["warning: assigned id rect2 to unnamed <rect>"]);
  });

  it("未知元素跳过并警告", () => {
    const file = path.join(tmpDir, "poly.svg");
    fs.writeFileSync(
      file,
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">',
        '  <polygon points="0,0 1,1"/>',
        '  <rect id="r1" width="1" height="1"/>',
        "</svg>",
      ].join("\n"),
      "utf8",
    );
    const { document, warnings } = new SvgReader(factory).read(file);
    expect(document.elementCount()).toBe(1);
    expect(warnings).toEqual(["warning: skipped unsupported element <polygon>"]);
  });

  it("transform 警告忽略", () => {
    const file = path.join(tmpDir, "tf.svg");
    fs.writeFileSync(
      file,
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">',
        '  <g id="g1" transform="translate(1,2)"/>',
        "</svg>",
      ].join("\n"),
      "utf8",
    );
    const { warnings } = new SvgReader(factory).read(file);
    expect(warnings).toEqual(['warning: ignored transform on <g id="g1">']);
  });

  it("非法 XML 报 cannot read file", () => {
    const file = path.join(tmpDir, "bad.svg");
    fs.writeFileSync(file, "<svg><unclosed></svg>", "utf8");
    expect(() => new SvgReader(factory).read(file)).toThrowError(
      `cannot read file: ${file}`,
    );
  });

  it("读入路径是目录时报 cannot read file", () => {
    expect(() => new SvgReader(factory).read(tmpDir)).toThrowError(
      `cannot read file: ${tmpDir}`,
    );
  });
});

describe("SvgWriter + round-trip", () => {
  it("写目标不可写（目录）时报 cannot write file", () => {
    const doc = new SvgDocument(10, 10);
    expect(() => new SvgWriter().write(doc, tmpDir)).toThrowError(
      `cannot write file: ${tmpDir}`,
    );
  });

  it("写出内容含 xml 声明与嵌套结构", () => {
    const doc = new SvgDocument(400, 200);
    const group = Group.fromSvg("flow", {});
    doc.insert(group, null);
    doc.insert(factory.createFromFile("rect", "start", { x: "30", y: "70", width: "120", height: "60", fill: "#4a90d9" }, "")!, group);
    doc.insert(factory.createFromFile("line", "edge", { x1: "150", y1: "100", x2: "250", y2: "100", stroke: "black" }, "")!, group);

    const writer = new SvgWriter();
    const file = path.join(tmpDir, "out.svg");
    writer.write(doc, file);
    const text = fs.readFileSync(file, "utf8");
    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(text).toContain('viewBox="0 0 400 200"');
    expect(text).toContain('  <g id="flow">');
    expect(text).toContain('    <rect id="start" fill="#4a90d9" x="30" y="70" width="120" height="60"/>');
    expect(text).toContain("</g>");
  });

  it("save → read 树结构不变（round-trip）", () => {
    const doc = new SvgDocument(800, 600);
    const group = Group.fromSvg("markers", {});
    doc.insert(group, null);
    doc.insert(factory.createFromFile("circle", "c1", { cx: "100", cy: "100", r: "20", fill: "red" }, "")!, group);
    doc.insert(factory.createFromFile("text", "t1", { x: "20", y: "40" }, "My Diagram")!, null);

    const writer = new SvgWriter();
    const file = path.join(tmpDir, "rt.svg");
    writer.write(doc, file);
    const { document: back } = new SvgReader(factory).read(file);

    expect(back.elementCount()).toBe(doc.elementCount());
    expect(back.findById("c1")?.geometrySummary()).toBe("cx=100 cy=100 r=20");
    expect(back.findById("c1")?.presentationSummary()).toBe("fill=red");
    expect(back.findById("t1")?.geometrySummary()).toBe('(20,40) "My Diagram"');
    expect(back.findById("c1")?.parent).toBe(back.findById("markers"));
  });
});
