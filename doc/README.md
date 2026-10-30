# SVG 编辑器（CLI）— Lab1 Phase 1

用 TypeScript 实现的命令行 SVG 编辑器：REPL 交互、Composite 图形树、Command 模式命令集、
整文档快照式 undo/redo、SVG 文件读写（round-trip）。实现与本方案的一致性见文末「一致性自查」。

## 架构方案

> 本节写于编码开始之前，是实现的蓝本；实现过程中如与方案出现偏差，记入文末「修订记录」。

### 1. 模块划分

| 模块（目录） | 职责 | 关键类 |
|---|---|---|
| `src/model/` | **领域核心**：图形树（Composite）与文档。不知道 CLI、文件、undo 的存在 | `Shape`（抽象基类）、`Rect` / `Circle` / `Ellipse` / `Line` / `TextElement`、`Group`、`SvgDocument` |
| `src/factory/` | 图形类型注册与创建：类型名 → 类 | `ShapeFactory` |
| `src/history/` | 撤销重做：快照栈、io 锁状态 | `History` |
| `src/io/` | SVG 文件读写：XML 解析（适配第三方解析库）与序列化 | `SvgReader`、`SvgWriter` |
| `src/commands/` | **应用层**：每条 CLI 命令一个类；会话状态（当前文档、输出通道） | `Command`（接口）、`InitCommand` … `HelpCommand`、`EditorError`、`Editor`（命令执行上下文） |
| `src/cli/` | 终端交互：REPL 循环、命令分词、命令分发 | `Repl`、`CommandParser`、`CommandRegistry`、`main.ts`（入口） |

包结构（PlantUML 包图，箭头=依赖方向）：

```plantuml
@startuml
package cli {
  [Repl]
  [CommandParser]
  [CommandRegistry]
}
package commands {
  [Command / 各命令类]
  [Editor]
  [EditorError]
}
package history { [History] }
package factory { [ShapeFactory] }
package io {
  [SvgReader]
  [SvgWriter]
}
package model {
  [Shape 层次 (Composite)]
  [SvgDocument]
}

[Repl] --> [CommandParser]
[Repl] --> [CommandRegistry]
[CommandRegistry] --> [Command / 各命令类]
[Command / 各命令类] --> [Editor]
[Command / 各命令类] --> [History]
[Command / 各命令类] --> [ShapeFactory]
[Command / 各命令类] --> [SvgReader]
[Command / 各命令类] --> [SvgWriter]
[Editor] --> [SvgDocument]
[History] --> [SvgDocument]
[SvgReader] --> [SvgDocument]
[SvgWriter] --> [SvgDocument]
[ShapeFactory] --> [Shape 层次 (Composite)]
[SvgDocument] --> [Shape 层次 (Composite)]
@enduml
```

### 2. 设计模式的选择

| 模式 | 落地位置 | 解决什么 |
|---|---|---|
| **Command**（作业要求） | `src/commands/`：每条命令一个类，实现统一接口 `execute(args, ctx)`；`Repl`/`CommandRegistry` 是调用方，完全不认识具体命令 | 命令与交互解耦：新增命令=新增一个类+一行注册；编辑命令天然是 undo 的单元；未来 GUI/agent 通道可复用同一批命令对象 |
| **Composite** | `src/model/`：`Shape` 抽象基类 + `Group` 容器；`move`/`scale`/`set`/`delete` 对叶子与容器一视同仁，容器把操作递归给子孙 | `group`/`box`(未来) 等复合图形无需特判；`ungroup` 提升位置天然成立 |
| **Memento** | `src/history/`：每条编辑命令执行前后各取一次整文档快照，`History` 存 `{before, after, undo回显, redo回显}`；undo/redo 即快照切换 | 撤销逻辑与业务命令完全解耦，`group`/`ungroup` 这类结构性变更不需要写脆弱的逆向操作；快照集中在 `History`，将来换增量方案只动一个模块 |
| **Factory Method（注册表形态）** | `src/factory/ShapeFactory`：类型名 → 类的映射表；`create` 与 `read` 都经它实例化。⚠️ **按名分派点②，标注待重构**：阶段2将演化为 `ShapeProvider` 插件注册（`box` 等复合类型） | 内核不认识具体类型名，为插件化留插槽 |
| **Adapter** | `src/io/SvgReader`：包装 `fast-xml-parser`，输出领域对象 | XML 解析这个"外部细节"被隔离在 io 模块内，换解析库不影响模型 |
| **Template Method** | `Shape` 基类固定 `show` 明细/`tree` 摘要的骨架（标题行、公共属性行），抽象钩子 `geometrySummary()` 由各子类提供自己的几何段 | 显示格式的公共部分只写一次，各图形只声明差异 |

**范式约束自查口令**：除上述两处按名分派（命令分发、图形工厂，均已标注待重构）外，代码中不允许出现 `switch (shape.type)` 式分支——类型差异全部走多态。

### 3. 依赖方向规则

| 模块 | 允许依赖 | 理由 |
|---|---|---|
| `model` | （无） | 领域核心必须稳定：替换 UI、文件格式、撤销机制都不应波及它 |
| `factory` / `history` / `io` | `model` | 都是围绕文档模型的"服务" |
| `commands` | `model` `history` `factory` `io` | 应用层编排服务与模型，是唯一知道"全家福"的层 |
| `cli` | `commands` | 终端只是命令的一种触发通道，不得越过命令层直接摸模型 |

禁令：`model` 依赖任何上层；`cli` 依赖 `model`/`io`；下层模块反向 import 上层。**任何违反即待处理项**，须记入修订记录。该规则由 `tests/architecture.test.ts` 自动化检查（静态扫描 import 语句）。

### 4. 变化点假设

| # | 变化点 | 留了什么 / 为什么不留 |
|---|---|---|
| 1 | **复合图形插件（阶段2的 `box`）** | 留了：`ShapeFactory` 是唯一"类型名→类"注册点，命令层对具体类型零特判；错误文案已按插件语义设计（`unknown shape type: box (is the plugin loaded?)`）；读回时 `data-kind` 标记的解析位留在 `SvgReader`。阶段2加 `ShapeProvider` 接口即可，内核改动趋近于 0 |
| 2 | **多通道前端（GUI / agent API）** | 留了：命令层与 REPL 解耦——`Repl` 只做分词与分发，命令经注入的输出通道（Writer 接口）回显，不直接碰 stdin/stdout。GUI 可直接复用 `Command` + `Editor` |
| 3 | **撤销机制的演化（增量快照 / 持久化 / 协同）** | 留了：快照获取与回放集中在 `History` 与 `SvgDocument.snapshot()`，变化不外溢 |
| 4 | **SVG 特性扩展（`transform`、`style`、`defs`/`use`）** | **决定不留**：本阶段命令语义是"直接改几何属性"，引入变换矩阵会让 `move`/`scale`/`ungroup 提升位置`的复合语义复杂化且无用武之地；读入遇到 `transform` 只警告忽略。解析集中在 io 适配器，将来要支持也不动模型 |
| 5 | **大文档性能（整文档快照 O(n)/次编辑）** | **决定不留**增量持久化结构：CLI 场景文档规模小，正确性与简单性优先；变化点3的封装保证了将来可替换 |
| 6 | **坐标系/单位（px 之外的单位）** | **决定不留**：模型存纯数字，SVG 本身以 px 为单位，YAGNI |

---

## 过程记录

（开发完成后补充）

## 一致性自查

（实现完成后补充）

## 质量保证手段

（实现完成后补充）
