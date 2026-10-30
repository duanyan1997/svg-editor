import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 显示类：全部命令与语法（不要求已有文档） */
export class HelpCommand implements Command {
  readonly name = "help";
  readonly usage = "help";
  readonly help = "show all commands and syntax";

  constructor(private readonly registry: { all(): Command[] }) {}

  execute(args: string[], ctx: Editor): void {
    if (args.length !== 0) throw new SvgError(`usage: ${this.usage}`);
    const commands = this.registry.all();
    const width = Math.max(...commands.map((c) => c.usage.length));
    for (const command of commands) {
      ctx.output.line(`${command.usage.padEnd(width + 2)}— ${command.help}`);
    }
  }
}
