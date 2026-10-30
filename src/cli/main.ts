import { createApp } from "./App.js";
import { StdoutOutput } from "./StdoutOutput.js";

const { repl } = createApp(process.stdin, new StdoutOutput());
await repl.run();
