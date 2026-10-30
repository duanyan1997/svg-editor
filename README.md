# svg-editor

Lab1 Phase 1：命令行 SVG 编辑器（TypeScript + OOP）。

## 运行

```bash
npm install
npm run cli        # 启动 REPL（提示符 svg>，help 查看命令）
npm test           # 119 个测试（单测 + 架构依赖检查 + 端到端 transcript 回放）
npm run typecheck  # tsc --noEmit
```

## 快速上手

```text
svg> init 800 600
canvas 800x600 created
svg> create rect r1 10 20 100 50 #eee
rect#r1 created
svg> tree
svg (800x600)
└── rect#r1  x=10 y=20 w=100 h=50 fill=#eee
svg> save demo.svg
```

`save` 输出的 `.svg` 可直接拖进浏览器预览。

## 架构与文档

架构方案、设计模式（Command / Composite / Memento / Factory / Adapter）、依赖方向规则、
变化点假设、过程记录、一致性自查与质量保证手段见 **[doc/README.md](doc/README.md)**。

```text
cli/       REPL、分词、命令注册分发（终端只是命令的一种触发通道）
commands/  每条命令一个类（Command 模式）+ 会话上下文 Editor
history/   撤销重做（整文档快照 Memento + io 锁）
factory/   类型名 → 类的唯一分派点（阶段2 ShapeProvider 插件插槽）
io/        SVG 读写（fast-xml-parser 适配器，round-trip）
model/     Composite 图形树 + SvgDocument（纯领域核心，不依赖任何模块）
```

依赖规则由 `tests/architecture.test.ts` 机器强制（静态扫描 import，违反即红灯）。
