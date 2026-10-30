import { Group } from "../model/Group.js";
import { SvgError } from "../model/SvgError.js";
import { Command } from "./Command.js";
import { Editor } from "./Editor.js";

/** 编辑类：新建容器并收入若干图形（整条命令 = 一个 undo 单元） */
export class GroupCommand implements Command {
  readonly name = "group";
  readonly usage = "group <newGid> <id1> <id2>…";
  readonly help = "create a container and adopt existing shapes into it";

  execute(args: string[], ctx: Editor): void {
    const doc = ctx.requireDocument();
    if (args.length < 3) throw new SvgError(`usage: ${this.usage}`);
    const newGid = args[0]!;
    const members = args.slice(1).map((id) => doc.require(id));

    // 校验先于任何状态变更：容器不得与其子孙同时收入
    for (const container of members) {
      if (container instanceof Group) {
        for (const other of members) {
          if (other !== container && container.contains(other)) {
            throw new SvgError(
              `cannot group a container into its own descendant: ${container.id}`,
            );
          }
        }
      }
    }
    if (doc.findById(newGid) !== null) throw new SvgError(`id already exists: ${newGid}`);

    const before = doc.snapshot();
    const group = new Group(newGid);
    doc.insert(group, null);
    for (const member of members) {
      doc.detach(member);
      doc.insert(member, group);
    }

    const created = `g#${newGid} created with ${members.length} children`;
    ctx.output.line(created);
    ctx.history.record({
      before,
      after: doc.snapshot(),
      undoLine: `g#${newGid} dissolved`,
      redoLine: created,
    });
  }
}
