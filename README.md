# 算法小故事

让学习算法变得简单有趣：每个算法一个小故事，加一个可以动手玩的网页演示，分「初级到高级」几个等级。

在线体验：<https://yuy-qk.github.io/algorithm-stories/>

## 已完成

| 算法 | 故事 | 等级 |
|---|---|---|
| [二分查找](content/algorithms/binary-search/) | 小邮差找信箱 | 初级、高级 |
| [冒泡排序](content/algorithms/bubble-sort/) | 排队拍合照 | 初级、高级 |

完整的候选算法清单见 [docs/algorithm-catalog.md](docs/algorithm-catalog.md)。整体规划和路线图见 [docs/project-plan.md](docs/project-plan.md)。

## 等级

| 等级 | 对象 | 学习方式 |
|---|---|---|
| 初级 | 小朋友 | 故事加点选和拖拽，不写代码 |
| 进阶 | 初学者 | 可视化加逻辑拼接 |
| 中级 | 在校生、转行者 | 可视化加简单代码 |
| 高级 | IT 从业者 | 逐步执行、代码、复杂度对比、工程应用 |

## 本地运行

需要 Node.js 22 以上和 Python 3。

```
npm install
npm run dev        # 本地预览，打开 http://localhost:4321/algorithm-stories/
npm test           # 算法引擎测试，并和 Python 参考实现对拍
npm run test:py    # 运行各个 Python 参考实现自带的测试
npm run build      # 构建静态网站到 dist/
```

技术栈：[Astro](https://astro.build) + Vue 3 + TypeScript，推到 `main` 后由 GitHub Actions 自动部署到 GitHub Pages。

## 目录

| 目录 | 内容 |
|---|---|
| `content/algorithms/<slug>/` | 每个算法的内容：`meta.json`、`story.md`、Python 参考实现 |
| `src/engine/` | 算法引擎：纯函数，输出每一步的状态 |
| `src/demos/<slug>/` | 每个算法的演示页和各等级的交互组件 |
| `src/components/shared/` | 共享组件：播放控制、代码面板、对比图等 |
| `tests/` | 引擎测试和 Python 对拍 |
| `prototypes/` | 最早的单文件原型，留作参考 |

新增一个算法的步骤见 `CLAUDE.md`。

## 许可

代码采用 [MIT](LICENSE)，故事和文字内容采用 [CC BY-NC-SA 4.0](LICENSE-CONTENT.md)。
