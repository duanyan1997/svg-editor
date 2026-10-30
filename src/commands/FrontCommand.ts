import { ZOrderCommand } from "./ZOrderCommand.js";

/** 调整 z-order：同级最前（渲染最上层） */
export class FrontCommand extends ZOrderCommand {
  readonly name = "front";
  readonly usage = "front <id>";
  readonly help = "bring a shape to the front of its siblings";
  protected readonly toFront = true;
}
