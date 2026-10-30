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

本项目由人与 AI 智能体协作完成：人提供规格（本作业文档）、评审关键决策；AI 负责架构方案起草、
编码与测试。工作流为「方案先行 → 分里程碑实现 → 机器对照自查」，以下记录有代表性的讨论与迭代。

### 1. 从"方案看似合理"到"机器证明合理"

架构方案 v1（见上方 §1–4）在写第一行业务代码之前提交。实现完成后，把方案里的依赖方向表
翻译成了 `tests/architecture.test.ts`（静态扫描 src/ 全部 import），机器立刻抓出两处方案与实现的偏差：

- **`cli/Repl.ts → model`**：REPL 为了格式化错误直接 import 了领域错误类 `SvgError`。
  纠正方式：把错误边界挪进命令层的 `Editor.run()`——Repl 只认识命令，错误分类属于应用层职责。
- **`io → factory`**：`SvgReader` 经 `ShapeFactory` 装配模型对象，而方案把 io 的允许依赖写成了仅 model。

第一条是改代码迁就方案；第二条是改方案迁就代码（读入路径本来就该经工厂装配）。
两个方向的修订都记录在「一致性自查 → 修订记录」。教训：**文档里写了规则 ≠ 代码遵守了规则**，
依赖方向这类约束必须交给测试看管。

### 2. 规格歧义的确认与决策

实现中遇到的规格未定义处，逐条决策并锁定在测试里：

| 歧义 | 决策 | 理由 |
|---|---|---|
| tree 的列对齐 | 同级最长标签 +2 对齐 | 规格示例自身不一致（§5.1 与 §6 同级行的对齐列不同），无法逐字节复刻；取一致规则并写进端到端断言 |
| `help` 是否要求已有文档 | 不要求 | help 描述的是命令集本身，与文档状态无关 |
| 空栈 undo/redo 文案 | `nothing to undo/redo` | 规格 §4.2 未定义，按 `error:` 风格补全 |
| create 的 undo 回显 | `rect#r1 deleted` / redo 重复 create 回显 | 与 delete 命令的既有回显风格一致 |
| ungroup/addto/front/back 的回显 | `dissolved`、`moved into`、`brought to front`、`z-order restored` 等 | 规格未给出，按「动词 + 结果」风格补全并测试锁定 |
| 无文档时 `canvas 1`（参数也有错） | 先报 `no document` | 规格 §2「未 read/init 就执行其他命令」是总则，优先于参数校验 |
| `group` 单成员 | 拒绝，报 usage | 语法表 `group <newGid> <id1> <id2>…` 要求至少两个 |
| 外部文件重复 id / 非法 XML | 读入失败（`error:` 文案），文档不变 | 读入路径宁可严格；§2「命令失败不改变任何状态」 |

### 3. 协作中发现并纠正的具体问题

以下问题均在 git 历史中可查（提交前的测试红灯或自查修正）：

- **History 恢复方向写反**：初版 `undo()` 误写成"快照互相恢复"、且没有引用活动文档，
  自查时发现 undo/redo 必须接收当前文档参数。整文档快照机制因此补了「恢复时克隆，
  快照本体可反复使用」的约束（否则 undo→redo 一次后快照被消耗）。
- **fast-xml-parser 默认不校验畸形 XML**：`<svg><unclosed></svg>` 不抛错而是给出残缺对象，
  导致"非法文件报 cannot read file"的用例红灯。补 `XMLValidator.validate` 前置校验。
- **未知元素先消耗自动 id**：初版对不支持元素（如 `<polygon>`）先分配 id 再发现不支持，
  产生多余警告且占用序号。改为先查 `hasFileBuilder` 再补 id——降级语义（阶段2 box 的
  round-trip 决策）不该有副作用。
- **REPL 提示符在管道模式下不显示**：`terminal: false` 让交互模式也没有 `svg>` 提示符。
  改为按 `isTTY` 决定，交互有提示符、脚本回放输出干净（两者都是需要的语义）。

### 4. 关键设计取舍

- **undo 采用整文档快照（Memento）而非逐命令逆向操作**：`group/ungroup` 这类结构性变更
  写逆向操作极易出错且互相耦合；快照把正确性问题收敛为一处（History），代价 O(文档)/次编辑，
  在 CLI 场景可接受（变化点 §4-5 说明为何不优化）。
- **容器不存自身几何**：`move/scale` 递归到子孙坐标，换来 `ungroup` 提升位置的天然正确
  （子图形坐标本来就是全局坐标）。
- **按名分派收敛到两处**（命令注册表、图形工厂），均标注待重构；类型差异全部走多态，
  全工程没有第二处 `switch (type)`。
- **命令与终端解耦**：`Output` 接口注入输出通道、`Editor.run()` 统一错误格式化，
  REPL 只是命令的一种触发通道——GUI/agent 通道（变化点 §4-2）可整体复用命令层。

---

## 一致性自查

### 1. 模块划分：实际目录 vs 方案

实际目录（`find src tests -name "*.ts"`）：

```text
src/
├── cli/        App.ts, Repl.ts, CommandParser.ts, CommandRegistry.ts, StdoutOutput.ts, main.ts
├── commands/   Command.ts, Editor.ts, Output.ts, parse.ts, ZOrderCommand.ts,
│               Init/Canvas/Save/Read/Create/Delete/Move/Scale/Set/Group/Ungroup/
│               Addto/Front/Back/Undo/Redo/Tree/Show/HelpCommand.ts（每命令一类）
├── history/    History.ts
├── factory/    ShapeFactory.ts
├── io/         SvgReader.ts, SvgWriter.ts
└── model/      Shape.ts, Rect/Circle/Ellipse/Line/TextElement.ts, Group.ts, SvgDocument.ts, SvgError.ts, format.ts
tests/          model/ commands/ history/ io/ cli/ e2e/ + architecture.test.ts
```

六个模块与方案的划分一致，一类一文件。偏差（均已记入修订记录）：

### 2. 依赖方向：规则是否被违反

机器检查：`tests/architecture.test.ts` 扫描 src/ 全部 import 并断言 §3 的规则表，
当前全部通过；`cli → model` 违规在实现中被它抓出并修正（见过程记录 §1）。
人工抽样：`src/model/*.ts` 无一 import 上层模块；`src/cli/Repl.ts` 仅 import `commands/`。

### 修订记录

| # | 方案 v1 说 | 实际/修订后 | 原因 |
|---|---|---|---|
| 1 | commands 模块含 `EditorError` | 未建此类，统一用 model 的 `SvgError` | 单一领域错误类型即可覆盖 §4.2 全部场景，双类型徒增转换 |
| 2 | io 只允许依赖 model | **修订规则为 io → {model, factory}**，测试同步 | `SvgReader` 本来就要经工厂装配模型对象，初版规则写漏 |
| 3 | cli 包含 Repl/CommandParser/CommandRegistry/main | 新增 `cli/App.ts`（组装根）、`cli/StdoutOutput.ts` | 装配逻辑要被入口与 e2e 测试共用；组合根豁免依赖规则（机器检查中的豁免名单） |
| 4 | 包图中未出现输出通道 | 新增 `commands/Output.ts`（`Output` 接口 + `BufferOutput`） | 命令层需要通道无关的回显出口，测试注入内存缓冲 |
| 5 | （实现中期发现）Repl 的 try/catch | 错误边界挪入 `Editor.run()` | 消除 `cli → model` 违规，见过程记录 §1 |

---

## 质量保证手段

**功能完整性如何确认**：以规格为测试的基准——

1. **端到端 transcript 回放**：把规格 §6（典型会话）与 §6.1（两节点流程图）逐行做成脚本灌入真实 REPL，
   断言全部输出（含树形显示、undo/redo 回显、io 锁、缺 id 警告与元素计数）逐行一致；
   另有一条用例从**真实子进程**（`npx tsx src/cli/main.ts`，即 `npm run cli`）验证进程边界。
2. **round-trip**：save → read 后树形输出逐行一致（含中文文本内容）。
3. **错误表全覆盖**：规格 §4.2 的每条错误信息都有断言（id 重复/不存在、容器校验、
   未知类型——含 box 的插件语义文案、子孙收编、顶层 ungroup、scale 非正、文件不可读/不可写、
   无文档、io 后 undo）。`cannot ungroup composite shape` 除外：本阶段无复合图形类型，无法触发
   （如实说明，非跳过——该错误属阶段2插件语义）。
4. **规格细节锁定**：叶子/容器 move 的不同回显、set 的 undo 用旧值、redo 栈清空时机、
   io 锁的解除时机、注释与空行跳过、双引号分词，均为独立断言。

**对代码质量的信心依据**：

1. **119 个自动化测试**（`npm test`，vitest）：模型层单测 33、命令层单测 54、History/分词/io
   共 24、架构依赖检查 3、端到端 5（含真实子进程入口）。全部通过，
   `tsc --noEmit` 零错误（strict 模式）。
2. **架构规则机器化**：`tests/architecture.test.ts` 让"方案与实现一致"从口头承诺变成红灯/绿灯。
3. **范式约束自查**：按名分派仅存在于 `CommandRegistry`（命令名→命令）与 `ShapeFactory`
   （类型名→类）两处，即方案标注待重构的两点；其余代码无任何 `switch (type)`；
   模型类全部带封装（几何字段 private，经 `setAttr/getAttr` 白名单访问），无贫血模型。
4. **失败不改状态**：所有编辑命令先校验后变更；快照机制保证任何命令序列撤销后文档
   与历史执行前逐字段一致（快照往返测试反复验证）。

**已知限制**（不影响本阶段验收，均为有意决策）：读入遇到 `transform` 警告忽略；
单文档会话（无多文档切换）；整文档快照的 O(n) 撤销开销。

