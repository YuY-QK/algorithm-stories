# 关卡规格

每个算法做成「看、玩、做、延伸」四步的小关卡。基调见 `docs/overview.md` 4a，冲突时以它为准。三层结构见 `AGENTS.md`。

## 新增一个算法

照二分查找这个样板关做（`src/demos/binary-search/`、`src/engine/binary-search.ts`、`exercises/.../binarysearch/`）。

1. `content/algorithms/<slug>/`：写 `meta.json`、`notes.md`、`story.md`
2. `src/engine/<slug>.ts`：引擎，参考代码的行号要和 `CODE` 数组一致
3. `tests/<slug>.test.ts`：大量随机输入检查每一步和最终结果。最终结果要和一个**独立的标准答案**比：语言自带的函数（如 `Array.prototype.sort`），或测试里另写的最朴素做法（暴力枚举、逐个比较），不能拿引擎自己的函数当答案
4. `src/demos/<slug>/`：`Demo.astro` 加四步的 Vue 组件，用 `<Fragment slot="look|play|do|more">` 传给 `AlgoLayout`。`src/demos/index.ts` 自动收集，不用登记
5. `exercises/`：加一个包，放函数框架、测试和参考答案
6. 更新 `docs/algorithm-catalog.md` 和根目录 `README.md`（由主线程统一做）

**为什么不再写 Python**：同一个算法原本写三遍（TS 引擎、Python、Kotlin 参考答案）。Python 的作用只是给引擎对拍，第 3 步的独立标准答案能起同样的作用，还少一个文件、少一套运行环境。早期关卡的 `<name>.py` 和 `tests/<slug>.crosscheck.test.ts` 保留，不回头删。

## 关卡结构

每个算法四步，页面上是四个标签：

| 步骤 | slot | 给谁 | 内容 |
|---|---|---|---|
| 看 | `look` | 孩子和大人 | 会动的绘本，每个画面最多一行字，画面由引擎生成 |
| 玩 | `play` | 孩子停在这里 | 一到两个小游戏，孩子当主角 |
| 做 | `do` | 大人继续 | 逐步执行、猜下一步、找 bug、亲手写（本地 Kotlin）、挑战 |
| 延伸 | `more` | 通关以后 | 复杂度、真实世界里的用法 |

「玩」的原则：引导式。用提示和追问让孩子自己发现规律，不直接给答案，也不放任乱点；答案预先固定，孩子没法耍赖；做错时给看得见的提示（晃一下、透出光），不说「错了」；以图标和动画为主，文字只做提示，能点就不拖。

## 页面约定

- 配色、字体和通用控件在 `src/styles/theme.css`，用里面的 CSS 变量，不写死颜色；算法独有的画面样式写在组件的 `<style scoped>` 里。theme.css 里有不少全局类名（如 `.num`、`.tag`、`.idx`、`.say`、`.note`、`.result`），scoped 样式挡不住它们，起类名前先搜一下
- 同时支持浅色和深色主题，手机宽度（375px）下不横向滚动
- 语言：简体中文
- `prototypes/` 是最早的单文件原型，只做参考，不再修改

## 共享组件与引擎数据格式（阶段 B 规格，2026-10-25）

背景：13 关的「看」「猜下一步」「找 bug」骨架相同却各写一份（盘点见 `docs/progress.md` 的阶段 B 记录）。原则：**共享骨架，不共享画面**。每关独有的是画面组件（`Street`、`Maze` 等）、题目内容、「玩」的小游戏和「挑战」；骨架（翻页、计时器、连对、答错提示、找 bug 面板）一律走共享组件，新关卡不许再抄。

### 1. 共享组件（`src/components/shared/`）

| 组件 | 管什么 | 接口 |
|---|---|---|
| `BookPager.vue`（新） | 看：`say` 台词、`.dots`、◀ ▶️⏸ ▶、末页的「再看一次」和「去玩」 | props：`frames: { say: string }[]`、`interval = 2200`、`againLabel = '再看一次'`；emit：`again`；默认插槽 `{ frame, index }` 放画面。内部用 `usePlayer(frames, [单档速度])`，所以自动订阅 `STAGE_CHANGE_EVENT`。「去玩」按钮保持 `data-goto="play"` |
| `useStreak.ts`（新） | 猜下一步的连对计数 | `useStreak(goal = 5)` → `{ streak, passed, hit(), miss() }`；`hit()` 连对 +1，达标则 `passed = true`；`miss()` 清零 |
| `PredictFrame.vue`（新） | 猜下一步的外框：`.stage`、连对和过关 chip、题干、答错提示、「下一题」 | props：`streak`、`goal`、`passed`、`prompt: string`、`wrong: string \| null`（非空时显示 `.oops-box` 和「知道了，继续」）、`ended: boolean`（显示「下一题」）；emit：`continue`、`next`；插槽：`chips`（本关额外 chip，如 target）、`board`（画面）、`answers`（按钮） |
| `BugHunt.vue`（新） | 找 bug 整个面板：选坑、已找到 n/m、标题、播放、`CodePanel` 可点行、红绿标记、答对后的解释与修正 | props：`bugs: Bug[]`、`run: (bug) => Step[]`（即各关 `runBug`）、`vars: (step, bug) => [string, string \| number][]`、`verdict: (step, bug) => string`、`speeds?`；作用域插槽 `board`（`{ step, bug }`）放本关画面，插槽 `input` 放输入说明。`solved / tried / marks / pick / count` 全在里面 |
| `usePlayer.ts`（扩） | 增加 `useStageStop(stop)`：挂载时监听 `STAGE_CHANGE_EVENT`，卸载时清理 | 任何自己开 `setTimeout` / `setInterval` 的组件（动画、赛跑）必须调用，切标签要停 |
| `timing.ts`（新） | 集中的速度与停顿：`SPEEDS`（慢/中/快 = 1300/800/350 ms）、`BOOK_INTERVAL`（绘本翻页 2200）、`PAUSE_SHORT/MID/LONG`（「玩」动画停顿 700/800/900） | `usePlayer` 的 `speeds` 缺省用 `SPEEDS`，`BookPager` 的 `interval` 缺省用 `BOOK_INTERVAL`。**新关卡与迁移的关卡不许自己写速度数字，一律引用 `timing.ts`**；以后调快慢只改这一个文件 |
| `theme.css`（扩） | 把重复 scoped 的类提到全局：`.oops-box`、`.dots`、`.nav`、`.big`（`.big.main`、`:disabled`、`:focus-visible`） | 各关删掉自己那份；`greedy` 的 `big-btn` 改回 `big` |

不动：`usePlayer`、`Transport`、`CodePanel`、`VarChips`、`Segmented`、`LogCompare` 现有接口。

**不抽共享的**：「玩」的两个小游戏、「挑战」、`DoTrace`（已是共享组件拼装）、猜下一步里的 `phase` 状态机（各关步骤数和点选方式不同，留在本关，只把计数和外框交给 `useStreak` / `PredictFrame`）。挑战的外框以后看样子再抽，现在不做。

### 2. 引擎数据格式（`src/engine/types.ts` 新增，新关卡必须用，旧关卡迁移时顺手对齐）

```ts
/** 看：绘本的一页。各关用交叉类型加自己的画面字段，台词一律由引擎生成 */
export interface LookFrame { say: string }

/** 找 bug 的一个坑。输入数据（数组、迷宫、操作序列等）放各关自己的扩展字段 */
export interface BugInfo {
  id: string;
  title: string;
  code: string[];       // 有坑的 Kotlin 代码，行号从 1 开始
  wrongLine: number;
  fixed: string;        // 该行的正确写法
  explain: string;
  expect: string;       // 正确的结果应该是什么
}
```

命名约定（每个 `src/engine/<slug>.ts` 都导出这些名字，没有的功能不导出）：

| 名字 | 形状 | 说明 |
|---|---|---|
| `CODE` | `string[]` | 参考代码，行号与 `Step.line` 一致 |
| `<Xxx>Step` | `extends Step` | 用算法全名，如 `SelectionStep`；旧的 `SortStep`、`QStep`、`SelStep` 迁移时改名 |
| `buildTrace(...)` | `Trace<XxxStep>` | 参数由算法决定，**不接收 bug 参数** |
| `BUGS` | `readonly (BugInfo & {...输入})[]` | 每个坑带齐自己的输入，输入字段名保持各关原样（不强行统一），但 `id` 一律是字面量联合 |
| `runBug(bug)` | `Trace<XxxStep>` | 返回的轨迹最后一步带 `outcome` 之类的结果字段 |
| `bugVerdict(step, bug)` | `string` | 找 bug 面板底部的判定文字，从组件搬进引擎（lru 的 `runBug().verdict` 改成这个） |
| `lookFrames(...)` | `LookFrame[]` 的子类型 | 「看」的全部页，**台词在引擎里**，不在组件里；`storyFrames` 改名 `lookFrames`；入参里有随机的，用 `rand` 参数 |
| `rounds(...)` | `Round[]` | 猜下一步的题；每题要有答案和 `why: string`（答错的解释文字在引擎，不在组件）；`Quiz`、`Question`、`Decision` 迁移时统一叫 `Round`，生成函数统一叫 `rounds`（出选项的题 `Round` 里带 `options`、`correct`） |
| `CHALLENGE_*`、`genChallenge(rand)` | | 挑战规模常量和出题函数。组件里不许直接 `Math.random`，随机一律由引擎函数的 `rand` 参数（默认 `Math.random`）注入，方便测试固定种子 |

随机源参数统一为**最后一个参数** `rand: () => number = Math.random`。

### 3. 迁移规则

1. 先只迁移二分查找，作为样板：`LookStory`、`DoPredict`、`DoBug` 改用共享组件，引擎名字对齐；Yumor 试玩确认样子没变、没坏。
2. 之后每关一个提交：改引擎（名字、台词、`why`、`bugVerdict`）→ 改三个组件 → 删掉该关的重复样式 → `npm test`、`npm run check`、对该关跑 `check-pages.cjs`。
3. 迁移是**纯重构**：页面外观和行为不变，除非顺手修了盘点里的三处计时器泄漏（`bubble-sort/DoPredict`、`dynamic-programming/DoPredict`、`insertion-sort/DoChallenge`，都改用 `useStageStop`）。
4. 引擎里改名要同步改 `tests/` 和（若有）`<name>.py` 对拍测试，改完测试必须全绿。
5. 迁移期间，没迁移的旧关卡继续能用；共享组件只加不改旧接口。
