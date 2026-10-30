import * as fs from "node:fs";

import { XMLParser, XMLValidator } from "fast-xml-parser";

import { ShapeFactory } from "../factory/ShapeFactory.js";
import { Group } from "../model/Group.js";
import { Shape } from "../model/Shape.js";
import { SvgDocument } from "../model/SvgDocument.js";
import { SvgError } from "../model/SvgError.js";

export interface ReadResult {
  document: SvgDocument;
  /** 完整的警告行（含 "warning: " 前缀），按文档顺序 */
  warnings: string[];
}

type XmlNode = Record<string, unknown>;

/**
 * SVG 文件读入：XML 解析细节被适配在本类内（模型不认识 XML）。
 * 缺 id 的元素按「标签名+序号」自动补 id 并产出警告；
 * 不支持的元素类型跳过并警告（降级而非失败，与阶段2 box 的 round-trip 决策一致）。
 */
export class SvgReader {
  constructor(private readonly factory: ShapeFactory) {}

  read(path: string): ReadResult {
    let raw: string;
    try {
      raw = fs.readFileSync(path, "utf8");
    } catch {
      throw new SvgError(`cannot read file: ${path}`);
    }
    if (XMLValidator.validate(raw) !== true) {
      throw new SvgError(`cannot read file: ${path}`);
    }

    let root: XmlNode | undefined;
    try {
      const parsed = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        parseTagValue: false,
        parseAttributeValue: false,
        trimValues: false,
        commentPropName: "#comment",
        cdataPropName: "#cdata",
      }).parse(raw) as XmlNode;
      root = parsed["svg"] as XmlNode | undefined;
    } catch {
      root = undefined;
    }
    if (!root || typeof root !== "object") {
      throw new SvgError(`cannot read file: ${path}`);
    }

    const warnings: string[] = [];
    const doc = new SvgDocument(...canvasSize(root));
    this.readChildren(root, doc, null, warnings);
    doc.setSourcePath(path);
    return { document: doc, warnings };
  }

  /** 递归装配元素；返回值是该层是否成功（用于警告计数与顺序） */
  private readChildren(
    node: XmlNode,
    doc: SvgDocument,
    parent: Group | null,
    warnings: string[],
  ): void {
    const counters = new Map<string, number>();
    for (const [tag, value] of elementEntries(node)) {
      for (const child of asArray(value)) {
        if (!isPlainObject(child)) continue;
        this.readElement(tag, child, doc, parent, warnings, counters);
      }
    }
  }

  private readElement(
    tag: string,
    node: XmlNode,
    doc: SvgDocument,
    parent: Group | null,
    warnings: string[],
    counters: Map<string, number>,
  ): void {
    // 先判断类型是否支持：未知元素不消耗自动 id 序号
    if (!this.factory.hasFileBuilder(tag)) {
      const known = attributesOf(node)["id"];
      warnings.push(
        known ? `warning: skipped unsupported element <${tag} id="${known}">`
              : `warning: skipped unsupported element <${tag}>`,
      );
      return;
    }

    const attrs = attributesOf(node);
    let id = attrs["id"];
    if (id === undefined || id === "") {
      id = nextAutoId(tag, counters, doc);
      warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
    }
    if (attrs["transform"] !== undefined) {
      warnings.push(`warning: ignored transform on <${tag} id="${id}">`);
    }

    const content = textContentOf(node);
    const shape = this.factory.createFromFile(tag, id, attrs, content);
    if (!shape) return;
    doc.insert(shape, parent);
    if (shape instanceof Group) {
      this.readChildren(node, doc, shape, warnings);
    }
  }
}

/** 元素子节点：跳过属性、文本、注释 */
function* elementEntries(node: XmlNode): Generator<[string, unknown]> {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("@_") || key === "#text" || key === "#cdata" || key === "#comment") continue;
    yield [key, value];
  }
}

function attributesOf(node: XmlNode): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("@_")) attrs[key.slice(2)] = String(value);
  }
  return attrs;
}

/** <text> 的内容 = 子文本（含 CDATA），忽略纯空白的排版节点 */
function textContentOf(node: XmlNode): string {
  const parts: string[] = [];
  for (const key of ["#text", "#cdata"]) {
    for (const part of asArray(node[key])) {
      if (typeof part === "string" && part.trim() !== "") parts.push(part);
    }
  }
  return parts.join("");
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value !== undefined ? [value] : [];
}

function isPlainObject(value: unknown): value is XmlNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 自动补 id：标签名+序号；与已有 id 冲突时继续向后找空位 */
function nextAutoId(tag: string, counters: Map<string, number>, doc: SvgDocument): string {
  let n = counters.get(tag) ?? 0;
  let id = `${tag}${++n}`;
  while (doc.findById(id) !== null) id = `${tag}${++n}`;
  counters.set(tag, n);
  return id;
}

/** 画布尺寸：优先 width/height 属性（容忍单位后缀），退化到 viewBox，最后默认 800x600 */
function canvasSize(root: XmlNode): [number, number] {
  const attrs = attributesOf(root);
  const w = lengthOf(attrs["width"]);
  const h = lengthOf(attrs["height"]);
  if (w !== null && h !== null) return [w, h];
  const box = attrs["viewBox"];
  if (box !== undefined) {
    const nums = box.trim().split(/\s+/).map(Number);
    if (nums.length === 4 && nums.every((n) => !Number.isNaN(n))) {
      return [nums[2]!, nums[3]!];
    }
  }
  return [800, 600];
}

function lengthOf(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number.parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}
