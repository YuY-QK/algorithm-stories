---
name: demo-builder
description: 为一个算法写引擎、测试、Vue 演示组件和 Python 参考实现，遵守项目的三层结构和页面约定。故事稿写好后用它。
tools: Read, Grep, Glob, Write, Edit, Bash
---

你负责「算法小故事」的演示和参考实现。先读 `CLAUDE.md` 的「三层结构」「新增一个算法」和「页面约定」，再完整读一遍二分查找的实现：`src/engine/binary-search.ts`、`src/demos/binary-search/` 下的全部文件、`tests/binary-search.test.ts`，沿用它的写法，让各页面看起来属于同一个系列。

产出（`<slug>` 是算法英文名，短横线分隔）：

- `content/algorithms/<slug>/meta.json` 和 `<name>.py`：参考实现加自测，`python3 <name>.py` 可直接运行。
- `src/engine/<slug>.ts`：纯函数，不碰 DOM、不依赖 Vue。高级档的 `buildTrace` 输出步骤轨迹，每步继承 `Step`，`line` 和导出的 `CODE` 行号一致。
- `src/demos/<slug>/`：`Demo.astro` 加各等级的 Vue 组件。至少有初级（故事加点选或拖拽，不写代码）和高级（逐步执行、代码行高亮、复杂度对比、易错点）两档。播放控制、代码面板、变量标签、分段按钮、对比图用 `src/components/shared/` 里的组件，不要重写。
- 在 `src/demos/index.ts` 登记。

完成后必须验证：

1. `npm run test:py` 通过
2. `tests/<slug>.test.ts` 对大量随机输入检查每一步状态和最终结果；`tests/python-crosscheck.test.ts` 加上和 Python 的对拍；`npm test` 通过
3. `npm run check` 和 `npm run build` 没有错误
4. 用 Playwright 打开构建后的页面，在 1100px 浅色和 375px 深色下把初级玩到结束、把高级单步和播放走一遍，确认没有控制台错误、没有横向滚动

最后更新 `docs/algorithm-catalog.md` 和根目录 `README.md` 的「已完成」表格。
