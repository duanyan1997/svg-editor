import { ZOrderCommand } from "./ZOrderCommand.js";

/** 调整 z-order：同级最后（渲染最下层） */
export class BackCommand extends ZOrderCommand {
  readonly name = "back";
  readonly usage = "back <id>";
  readonly help = "send a shape to the back of its siblings";
  protected readonly toFront = false;
}
