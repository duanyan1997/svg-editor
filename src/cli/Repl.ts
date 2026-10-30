import * as readline from "node:readline";

const BANNER = "svg-editor 0.1 — type 'help' for commands";
const PROMPT = "svg> ";

export class Repl {
  private readonly rl: readline.Interface;

  constructor(
    private readonly input: NodeJS.ReadableStream,
    private readonly output: NodeJS.WritableStream,
  ) {
    this.rl = readline.createInterface({ input, terminal: false });
  }

  async run(): Promise<void> {
    this.write(BANNER);
    this.rl.setPrompt(PROMPT);
    this.rl.prompt();

    this.rl.on("line", (line: string) => {
      this.handle(line);
      this.rl.prompt();
    });

    return new Promise((resolve) => {
      this.rl.on("close", resolve);
    });
  }

  private handle(line: string): void {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) return;
    const name = trimmed.split(/\s+/)[0];
    if (name) this.write(`error: unknown command: ${name}`);
  }

  private write(text: string): void {
    this.output.write(text + "\n");
  }
}
