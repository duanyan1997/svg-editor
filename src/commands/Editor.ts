import { ShapeFactory } from "../factory/ShapeFactory.js";
import { History } from "../history/History.js";
import { SvgReader } from "../io/SvgReader.js";
import { SvgWriter } from "../io/SvgWriter.js";
import { SvgDocument } from "../model/SvgDocument.js";
import { SvgError } from "../model/SvgError.js";
import { Output } from "./Output.js";

/**
 * 命令执行上下文：会话状态（当前文档、撤销栈、输出通道）与服务的汇聚点。
 * 命令只依赖它，不直接触碰 stdin/stdout / 文件系统单例。
 */
export class Editor {
  document: SvgDocument | null = null;
  readonly history = new History();

  constructor(
    readonly factory: ShapeFactory,
    readonly output: Output,
    readonly reader: SvgReader,
    readonly writer: SvgWriter,
  ) {}

  /** 除 init/read（及 help）外的命令都要求已有文档 */
  requireDocument(): SvgDocument {
    if (!this.document) throw new SvgError("no document. use 'init' or 'read' first");
    return this.document;
  }

  /** 换文档（init/read）：清空撤销历史并进入 io 锁定态 */
  replaceDocument(doc: SvgDocument): void {
    this.document = doc;
    this.history.clear();
  }
}
