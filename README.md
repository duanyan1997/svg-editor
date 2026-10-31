# svg-editor

Lab1 Phase 1 的作业，一个命令行的 SVG 编辑器，TypeScript 写的。

按课程要求这个作业用 AI 协作完成。我的做法是先把架构方案写完放进 doc/README.md，
然后照着方案一块块实现，每完成一个模块就提交一次。实现过程中发现方案本身有问题的地方
（比如 io 对 factory 的依赖漏写了），改掉之后记在文档的修订记录里。

## 运行

```bash
npm install
npm test       # 119 个测试
npm run cli    # 启动，svg> 提示符，help 看命令
```

## 支持的命令

init / read / save / canvas 是文档操作，create / delete / move / scale / set /
group / ungroup / addto / front / back 是编辑（可以 undo / redo），tree / show /
help 是查看。save 出来的 .svg 可以直接拖进浏览器看效果，read 读回来内容不变。

具体的设计（Command 模式、Composite 图形树、快照式 undo、模块之间的依赖规则）
和开发过程都写在 doc/README.md 里，这里不重复了。
