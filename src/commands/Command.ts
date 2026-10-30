import { Editor } from "./Editor.js";

/** 一条 CLI 命令（Command 模式）：调用方（Repl/Registry）不认识具体命令 */
export interface Command {
  /** 命令名（分词后的第一个 token） */
  readonly name: string;
  /** help 展示的语法行，如 "create <type> <id> [params…] [in <containerId>]" */
  readonly usage: string;
  /** help 展示的一行说明 */
  readonly help: string;

  /**
   * 参数解析、校验、执行。校验先于任何状态变更（命令失败不改变状态）；
   * 业务失败抛 SvgError（Repl 统一加 "error: " 前缀）。
   */
  execute(args: string[], ctx: Editor): void;
}
