import * as fs from "node:fs";

import { SvgDocument } from "../model/SvgDocument.js";
import { SvgError } from "../model/SvgError.js";

const XMLNS = "http://www.w3.org/2000/svg";

/** SVG 文件写出：序列化由模型（Shape.serialize）完成，这里只负责文档外壳与文件系统 */
export class SvgWriter {
  write(doc: SvgDocument, path: string): void {
    try {
      fs.writeFileSync(path, this.render(doc), "utf8");
    } catch {
      throw new SvgError(`cannot write file: ${path}`);
    }
  }

  private render(doc: SvgDocument): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      `<svg xmlns="${XMLNS}" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">`,
    );
    for (const root of doc.topLevels()) root.serialize(lines, 1);
    lines.push("</svg>");
    return lines.join("\n") + "\n";
  }
}
