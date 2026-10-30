import * as readline from "node:readline";

import { Editor } from "../commands/Editor.js";
import { Output } from "../commands/Output.js";
import { SvgError } from "../model/SvgError.js";
import { CommandParser } from "./CommandParser.js";
import { CommandRegistry } from "./CommandRegistry.js";

const BANNER = "svg-editor 0.1 — type 'help' for commands";
const PROMPT = "svg> ";

/** REPL：逐行读入、跳过注释与空行、分发命令。它不认识任何具体命令 */
export class Repl {
  private readonly rl: readline.Interface;

  constructor(
    input: NodeJS.ReadableStream,
    private readonly output: Output,
    private readonly registry: CommandRegistry,
    private readonly editor: Editor,
  ) {
    this.rl = readline.createInterface({ input, terminal: false });
  }

  async run(): Promise<void> {
    this.output.line(BANNER);
    this.rl.setPrompt(PROMPT);
    this.rl.prompt();

    this.rl.on("line", (line: string) => {
      this.dispatch(line);
      this.rl.prompt();
    });

    return new Promise((resolve) => {
      this.rl.on("close", resolve);
    });
  }

  private dispatch(line: string): void {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) return;
    const [name = "", ...args] = CommandParser.parse(trimmed);
    if (name === "") return;

    const command = this.registry.find(name);
    if (!command) {
      this.output.line(`error: unknown command: ${name}`);
      return;
    }
    try {
      command.execute(args, this.editor);
    } catch (err) {
      this.output.line(
        err instanceof SvgError ? `error: ${err.message}` : `error: internal: ${String(err)}`,
      );
    }
  }
}
