# 算法小故事

用小故事和小游戏学算法。每个算法是一个小关卡：先看懂，再在玩的过程中练会。孩子玩到懂规则就停，大人继续练到能亲手写出来。

在线体验：<https://yuy-qk.github.io/algorithm-stories/>

## 已完成

共 13 关，每关都有看、玩、做、延伸四步，点名字直接玩。

| 分类 | 算法 | 故事 |
|---|---|---|
| 查找 | [二分查找](https://yuy-qk.github.io/algorithm-stories/algo/binary-search/) | 小邮差找信箱 |
| 排序 | [冒泡排序](https://yuy-qk.github.io/algorithm-stories/algo/bubble-sort/) | 排队拍合照 |
| 排序 | [选择排序](https://yuy-qk.github.io/algorithm-stories/algo/selection-sort/) | 小熊排糖果 |
| 排序 | [插入排序](https://yuy-qk.github.io/algorithm-stories/algo/insertion-sort/) | 小熊理纸牌 |
| 排序 | [归并排序](https://yuy-qk.github.io/algorithm-stories/algo/merge-sort/) | 两队合一队 |
| 排序 | [快速排序](https://yuy-qk.github.io/algorithm-stories/algo/quick-sort/) | 体育课排队 |
| 数据结构 | [栈](https://yuy-qk.github.io/algorithm-stories/algo/stack/) | 小熊叠盘子 |
| 数据结构 | [队列](https://yuy-qk.github.io/algorithm-stories/algo/queue/) | 奶茶店排队 |
| 搜索与图 | [广度优先搜索](https://yuy-qk.github.io/algorithm-stories/algo/bfs/) | 小老鼠走迷宫 |
| 搜索与图 | [深度优先搜索](https://yuy-qk.github.io/algorithm-stories/algo/dfs/) | 探险家走山洞 |
| 算法思想 | [贪心算法](https://yuy-qk.github.io/algorithm-stories/algo/greedy/) | 小熊的小卖部 |
| 算法思想 | [动态规划](https://yuy-qk.github.io/algorithm-stories/algo/dynamic-programming/) | 小兔子爬楼梯 |
| 工程常用 | [LRU 缓存](https://yuy-qk.github.io/algorithm-stories/algo/lru-cache/) | 书桌上的五本书 |

项目的基调见 [docs/overview.md](docs/overview.md)，候选算法清单见 [docs/algorithm-catalog.md](docs/algorithm-catalog.md)。

## 每关四步

| 步骤 | 给谁 | 内容 |
|---|---|---|
| 👀 看 | 孩子和大人 | 会动的绘本，图形和动画讲清楚算法在做什么 |
| 🎮 玩 | 孩子停在这里 | 小游戏，孩子当主角，在提示里自己发现规律 |
| 🛠️ 做 | 大人继续 | 逐步执行、猜下一步、找 bug、亲手写 Kotlin、挑战 |
| 📖 延伸 | 通关以后 | 复杂度和真实世界里的用法 |

## 本地运行

网站需要 Node.js 22 以上和 Python 3；Kotlin 练习需要 JDK 17 以上，见 [exercises/README.md](exercises/README.md)。

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
| `exercises/` | Kotlin 练习项目：「亲手写」的函数框架、测试和参考答案 |
| `src/engine/` | 算法引擎：纯函数，输出每一步的状态 |
| `src/demos/<slug>/` | 每个算法的关卡页和四步的交互组件 |
| `src/components/shared/` | 共享组件：播放控制、代码面板、对比图等 |
| `tests/` | 引擎测试和 Python 对拍 |
| `prototypes/` | 最早的单文件原型，留作参考 |

新增一个算法的步骤见 `docs/level-spec.md`。

## 许可

代码采用 [MIT](LICENSE)，故事和文字内容采用 [CC BY-NC-SA 4.0](LICENSE-CONTENT.md)。
