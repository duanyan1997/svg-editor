import { Group } from "../model/Group.js";
import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 编辑类：创建图形，`in` 子句直接指定父容器；一条 create = 一个 undo 单元 */
export class CreateCommand implements Command {
  readonly name = "create";
  readonly usage = "create <type> <id> [params…] [in <containerId>]";
  readonly help = "create a shape, optionally inside a container";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length < 2) throw new SvgError(`usage: ${this.usage}`);
    const [type, id, ...rest] = args;
    let params = rest;
    let container: Group | null = null;
    if (params.length >= 2 && params[params.length - 2] === "in") {
      const containerId = params[params.length - 1]!;
      params = params.slice(0, -2);
      const target = doc.findById(containerId);
      if (!target) throw new SvgError(`no such container: ${containerId}`);
      if (!(target instanceof Group)) throw new SvgError(`not a container: ${containerId}`);
      container = target;
    }

    const shape = ctx.factory.createFromCli(type!, id!, params);
    const before = doc.snapshot();
    doc.insert(shape, container);
    const created = container
      ? `${shape.label()} created in ${container.label()}`
      : `${shape.label()} created`;
    ctx.output.line(created);
    ctx.history.record({
      before,
      after: doc.snapshot(),
      undoLine: `${shape.label()} deleted`,
      redoLine: created,
    });
  }
}
