# 阶段 R：架构重构方案

版本：草案 v0.1（2026-10-26），等 Yumor 确认。确认后把定下来的部分并入 `level-spec.md`，本文件留作记录。

## 1. 要解决什么

`overview.md` 4d：数据、流程、文案和界面分开；新增算法只加配置；换平台、换语言只重写页面。

现状（15 关，引擎约 9 千行，界面约 1.5 万行）：

| 东西 | 现在在哪 | 问题 |
|---|---|---|
| 算法规则、轨迹、题目 | `src/engine/<slug>.ts` | 已是纯函数，基本没问题 |
| 台词、提示、解释 | 一半在引擎里拼中文字符串，一半写死在 Vue 组件里 | 换语言要改两层代码 |
| 流程（玩的小游戏状态机、猜下一步的 `phase`、计时器） | 各关 Vue 组件里，30 个小游戏、15 个猜下一步各写一份 | 换平台全部重写；这部分逻辑没有测试 |
| 页面结构（有哪些块、标题、引导语） | 各关 `Demo.astro` | 新增一关要抄一份 |
| 延伸阅读正文、练习说明 | 各关 `Demo.astro` 里的 HTML | 内容混在页面代码里 |
| 画面（街道、迷宫、盘子） | 各关 Vue 组件，部分还夹着流程 | 本来就该是界面层 |
| 主题 | `theme.css` 的变量 | 只有 CSS 能用 |

## 2. 先说清边界

「新增算法只加配置」做不到百分之百：每个算法的**规则**（二分怎么缩范围）和**画面**（信箱长什么样）是它独有的，没法写成配置。能做到的是：

> 新增一关 = **一份配置**（页面结构 + 文案 + 延伸阅读）+ **规则**（引擎，纯 TS）+ **画面**（只负责画，不含流程）

流程（翻页、猜下一步、找 bug、小游戏的回合与反馈、挑战、计时）全部做成共享的，新关卡不再写任何流程代码。换平台时，配置、文案、主题原样复用，引擎和流程是纯 TS：网页类平台（PWA、套壳 App）直接复用；原生 Kotlin / Swift 需要照着测试移植逻辑，只有画面和外框一定要重写。

## 3. 分层

```
content/algorithms/<slug>/      ← 数据：谁都能读的 JSON / Markdown
  meta.json                       已有，不变
  level.json                      新：四步各有哪些块，每块的类型、图标、标题、引导语、参数
  copy.zh.json                    新：这一关所有给人看的字，键 → 模板，如 "dirSay": "信在{dir}"
  more.md                         新：延伸阅读正文（原来写在 Demo.astro 里的 HTML）
  notes.md / story.md             已有，不变

src/core/                       ← 流程：纯 TS，不碰 DOM、不依赖 Vue（新）
  types.ts                        Step、LookFrame、BugInfo（从 engine/types.ts 移来）+ Msg、Round、GameRules
  i18n.ts                         t(msg, copy)：把 { key, params } 填成文字
  flows/book.ts                   看：翻页
  flows/predict.ts                猜下一步：通用的「每题若干问」状态机 + 连对
  flows/bughunt.ts                找 bug：选坑、播放、点行、判定
  flows/game.ts                   玩和挑战：回合、反馈、自动步骤、星星、引导追问
  timing.ts、sound 事件名          从 components/shared 移来

src/engine/<slug>.ts            ← 规则：纯 TS，每关一份（保留，改造）
  不再拼中文，改为返回 Msg（{ key, params }）
  导出统一的关卡模块：lookFrames、buildTrace、rounds、BUGS、runBug、games、challenge

src/ui/vue/                     ← 界面：只有这一层和平台有关
  LevelPage.astro                 读 level.json，按块类型挂对应的控件；取代 15 个 Demo.astro
  widgets/                        Book、Trace、Predict、BugHunt、Game、Challenge、Exercise、Compare、Prose
  scenes/<slug>/                  每关的画面：收 state，画出来，被点时 emit('pick', 目标)，别的不管

src/theme/tokens.json           ← 主题：颜色、圆角、阴影、速度的唯一来源，生成 theme.css（新）
```

### 3.1 两个关键协议

**文案**：引擎和流程只产生 `Msg`，不产生文字。

```ts
interface Msg { key: string; params?: Record<string, string | number | Msg> }
// 引擎：return { say: { key: 'dirSay', params: { dir: { key: 'left' } } } }
// copy.zh.json：{ "dirSay": "信在{dir}", "left": "左边 ⬅️" }
```

共用的字（「再看一次」「下一题」「知道了，继续」）放 `src/core/copy.zh.json`，各关的放各关目录。以后做英文版只加 `copy.en.json`。

**小游戏**：每个「玩」和「挑战」写成一份规则，由共享的 `Game` 控件播放。

```ts
interface GameRules<S, A> {
  start(rand): S                          // 开局（答案在这里固定，孩子没法耍赖）
  act(s: S, a: A): Outcome<S>             // 孩子点了一下
  tick?(s: S): Outcome<S> | null          // 自动步骤（动画），由 Game 按 timing 驱动，切标签自动停
  buttons(s: S): { id: A; label: Msg }[]  // 此刻能按的按钮
  result(s: S): { stars?: 1|2|3; ask?: Quiz } | null   // 结束时的星星和追问
}
interface Outcome<S> { state: S; say?: Msg; sound?: 'right'|'wrong'|'win'; shake?: unknown }
```

做错「晃一下、透出光」、点灰格子摇头、几局后问「点哪里最快」，都通过 `Outcome` 和 `result` 表达，所以**「玩」的引导式原则第一次能写成单元测试**。

猜下一步同理：每题是若干「问」，每问要么点画面上的东西，要么从选项里选，带答案和 `why`。现在 15 关的 `phase` 都是 1～2 问，这个形状都装得下。

### 3.2 留一个出口

真有装不进 `GameRules` 的小游戏，`level.json` 里可以写 `"kind": "custom"` 挂一个自带流程的组件，但要在本文件登记原因。目标是 0 个，试做和迁移时数一下。

## 4. 不变的

- 页面外观、交互、网址、四步结构；迁移是纯重构，试玩时应看不出区别
- Kotlin 练习（`exercises/`）、`notes.md`、`story.md`、`.py` 对拍
- 已有的引擎测试继续用：改的是台词从字符串变成 `Msg`，对应断言改成比对键或比对 `t()` 后的文字

## 5. 步骤

| 步 | 内容 | 谁做 | 检查点 |
|---|---|---|---|
| R1 | 本方案 | 主线程 | Yumor 确认（含第 6 节的问题） |
| R2 | 搭 `core/`、`tokens.json`、`LevelPage` 和通用控件；二分查找整关迁过去（两个小游戏 + 挑战都走 `GameRules`） | 主线程定接口，sonnet 子线程实现 | `npm test`、`npm run check`、check-pages 通过；Yumor 试玩二分查找，看不出区别 |
| R3 | 其余 14 关迁移：每个子线程两关、每关一个提交；先迁结构相近的（排序四关、查找两关、栈和队列……） | sonnet 子线程，最多同时两个 | 每关：测试、check-pages；记下用了 `custom` 的地方 |
| R4 | 删掉 `src/demos/` 和旧共享组件；改 `level-spec.md`、`AGENTS.md`、`demo-builder` 的说明；整站检查 | 主线程 + haiku 跑检查 | 全部测试、check-pages 两种宽度全过；新增一关的步骤写成「加配置 + 规则 + 画面」 |

R2 是风险最大的一步：接口在这里定型。如果二分查找的两个小游戏装进 `GameRules` 很别扭，先回来改协议，再往下迁。

## 6. 请 Yumor 决定

1. **边界**：接受「配置 + 规则 + 画面」三件，而不是字面上的「只加一份配置」？（推荐接受，规则和画面配置化反而更难写）
2. **配置格式**：JSON（推荐：Astro、Kotlin、Swift 都原生能读，不加依赖）还是 YAML（手改更舒服）？
3. **试做关**：二分查找（推荐：样板关，两个小游戏一个出题一个找，最能检验 `GameRules`）？
4. **多语言**：现在只把文案结构做成支持多语言、不翻译（推荐），还是试做关顺手出一份英文？
