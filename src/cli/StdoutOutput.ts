import { Output } from "../commands/Output.js";

/** REPL 的标准输出通道 */
export class StdoutOutput implements Output {
  line(text: string): void {
    process.stdout.write(text + "\n");
  }
}
