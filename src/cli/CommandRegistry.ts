import { Command } from "../commands/Command.js";

/**
 * 命令注册表：命令名 → 实现的唯一按名分派点之一（架构方案标注为待重构）。
 * 阶段2可改为插件自动注册，调用方不变。
 */
export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  find(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /** 注册顺序（help 按此排列） */
  all(): Command[] {
    return [...this.commands.values()];
  }
}
