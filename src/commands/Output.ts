/** 命令与 History 的回显通道：REPL 注入 stdout，测试注入内存缓冲 */
export interface Output {
  line(text: string): void;
}

/** 内存输出，单元测试用 */
export class BufferOutput implements Output {
  readonly lines: string[] = [];

  line(text: string): void {
    this.lines.push(text);
  }

  text(): string {
    return this.lines.join("\n");
  }
}
