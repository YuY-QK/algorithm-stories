# 关卡规格

每个算法做成「看、玩、做、延伸」四步的小关卡。基调见 `docs/overview.md` 4a，冲突时以它为准。三层结构见 `AGENTS.md`。

## 新增一个算法

照二分查找这个样板关做（`src/levels/binary-search/`、`src/engine/binary-search.ts`、`src/demos/binary-search/`、`src/locales/zh/binary-search.json`、`exercises/.../binarysearch/`）。分层规则见末节「架构：逻辑、流程、文案、页面结构分开」。

1. `content/algorithms/<slug>/`：写 `meta.json`（只放分类、步骤、顺序）、`notes.md`、`story.md`
2. `src/locales/zh/<slug>.json`：这一关的全部文案，包括 `meta.title` 等
3. `src/engine/<slug>.ts`：引擎，只产出 Msg；参考代码的行号要和 `CODE` 数组一致
4. `src/levels/<slug>/flows.ts`：玩法、猜下一步、挑战、逐步执行输入的状态机；`level.ts`：四步里各有哪些块
5. `src/demos/<slug>/`：画面组件和 `views.ts`
6. `tests/<slug>.test.ts`（引擎）、`tests/<slug>.flows.test.ts`（流程）：大量随机输入检查每一步和最终结果。最终结果要和一个**独立的标准答案**比：语言自带的函数（如 `Array.prototype.sort`），或测试里另写的最朴素做法（暴力枚举、逐个比较），不能拿引擎自己的函数当答案
7. `exercises/`：加一个包，放函数框架、测试和参考答案
8. 更新 `docs/algorithm-catalog.md` 和根目录 `README.md`（由主线程统一做）

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
- 语言：简体中文，文字一律写在 `src/locales/zh/` 里（见末节）
- `prototypes/` 是最早的单文件原型，只做参考，不再修改

## 共享组件与引擎数据格式（阶段 B 规格，2026-10-25；文字、组件拆分以末节阶段 R 为准）

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
| `theme.css`（扩） | 把重复 scoped 的类提到全局：`.oops-box`、`.dots`、`.nav`、`.pager-btn`（`.pager-btn.main`、`:disabled`、`:focus-visible`） | 各关删掉自己那份；各关旧 LookStory 的 scoped `.big`、`.big-btn` 迁移时删掉；全局类不叫 `.big`，因为 `.big` 在 greedy、queue、dp、merge 的「玩」里另有用途，会撞名 |

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

## 架构：逻辑、流程、文案、页面结构分开（阶段 R 规格，2026-10-26）

目标：换平台只重写「放映机」和画面，换语言只加语言文件。样板是二分查找，迁移其余关卡时照着它做。

### 1. 分层

| 层 | 位置 | 规则 |
|---|---|---|
| 文案 | `src/locales/zh/common.json`（全站通用）、`src/locales/zh/<slug>.json`（一关一个） | 一层扁平的「键 → 字符串」，键用点分段：`look.*`、`play.<游戏>.*`、`do.trace.*`、`do.predict.*`、`do.bugs.*`、`do.write.*`、`do.challenge.*`、`more.*`、`meta.*`。参数写 `{name}`；可以写 `` `代码` ``、`**加粗**`、`[文字](链接)`。关卡文件不许和 common 重名（测试会查）。通用的块标题用 common 的 `block.trace / predict / bugs / write / challenge` |
| 引擎 | `src/engine/<slug>.ts` | 不写给人看的文字，只产出 `Msg`（键加参数）：`const msg = msgOf<typeof zh>()`，`import type zh from '../locales/zh/<slug>.json'`，键写错 `npm run check` 报错。步骤写 `extends Step<Msg>`，绘本页 `extends LookFrame<Msg>`，坑 `extends BugInfo<Msg>`。原来写在组件里的文字（总结、「输入：」那句、判定）搬进引擎函数（如 `traceSummary`、`bugInput`、`bugVerdict` 返回 `Msg \| null`） |
| 流程 | `src/levels/<slug>/flows.ts` | 玩法、猜下一步、挑战、逐步执行的输入，各写成一个 `Flow<State, Action>`（`src/levels/types.ts`）：`init(rand)`、`step(state, action, rand)`、可选 `interrupt(state)`（切标签时收拾动画）。纯函数、不原地改状态；要显示的文字放在状态里（`say: Msg` 等）。声音和定时都写成效果：`{ sound }`、`{ after: PAUSE_*, then: 动作 }`，组件里不许再有 `setTimeout` 推进规则。重播的动画（晃一下、透光）在状态里放 `[位置, 次数]`，画面组件看到次数变了就重播 |
| 配置 | `src/levels/<slug>/level.ts` | 四步里各有哪些块，用 `book / game / predict / trace / bugs / write / prose` 这几个函数写（见 types.ts 的注释）。title、intro、goal 等都是键 |
| 画面 | `src/demos/<slug>/*.vue` + `views.ts` | 只画状态、把点击变成 `send(动作)`，不写规则；文字用 `t(键或 Msg)`（`src/i18n/runtime.ts`）。views.ts 导出「名字 → 组件」，名字和配置里的 `view` 对应 |
| 放映机 | `src/runtime/` | 共享，不随关卡改。`LevelPage` 排四步；`LevelIsland` 按需加载一关的配置和画面；`BookHost`（画面收到 `{ frame }`）、`GameHost`（显示 goal 和 `state.say`，画面收到 `{ s, send }`）、`PredictHost`（外框由状态的 `PredictState` 字段决定，画面收到 `{ s, send, part: 'board' \| 'answers' }`）、`TraceHost`（画面收到 `{ input, send, step, part: 'controls' \| 'board' }`，变量、步骤说明、播放条、跳转按钮、总结、代码面板都在这里）、`BugHost`（画面收到 `{ step, bug }`）；亲手写、延伸在构建时生成（`WriteBlock`、`ProseBlock`） |

变量小标签（`vars`、`chips`）的名字和值：字符串原样显示（变量名、数字），`Msg` 才翻译（如「已检查」）。

### 2. 迁移一关的步骤（R3）

1. 把引擎、组件、`Demo.astro` 里所有中文搬进 `src/locales/zh/<slug>.json`（`meta.*` 已经在了），文字一个字不改
2. 引擎改成只产出 Msg，原来在组件里的文字逻辑搬进引擎
3. 组件里的规则搬进 `flows.ts`，**随机数调用的先后要和原来一致**（页面快照靠它比对）
4. 写 `level.ts`、`views.ts`，组件改成只画画面；删掉 `Demo.astro`、`LookStory`、`DoTrace`、`DoPredict`、`DoBug`、`DoChallenge` 等外壳
5. 测试：引擎测试里比文字的地方用 `tests/helpers/i18n.ts` 的 `zh(slug)` 翻译后再比，并用 `expectTranslatable` 检查；新增 `tests/<slug>.flows.test.ts`，用 `tests/helpers/flow.ts` 的 `driver` 把每个流程从头玩到尾（包括答错、点错、切标签）
6. 检查：`npm test`、`npm run check`、`npm run build` 后 `npm run snapshot -- --check <slug>` **必须一致**；再用 `check-pages.cjs` 看这一关；最后在浏览器里每个游戏点几下（快照只看初始画面）

纯重构：页面外观、文字、行为都不变。快照不一致时，先找原因；确实只是无关紧要的差别（比如随机数先后变了），在交回的总结里写清楚。

### 3. 迁移期间

- `src/pages/algo/[slug].astro`：有 `src/levels/<slug>/level.ts` 的按配置生成，否则还用旧的 `Demo.astro`
- `engine/types.ts` 的 `Step`、`LookFrame`、`BugInfo` 带类型参数（旧关卡 `string`，新关卡 `Msg`）；共享组件里的 `show()` 同时接受两种。全部迁完后去掉类型参数、`show()` 改回 `t()`、删掉 `src/demos/index.ts` 和 `AlgoLayout` 之外的旧路径（R4）
- 页面文字快照：`tests/snapshots/pages/<slug>.txt`，`npm run snapshot -- --check` 对比；R4 收尾后保留，作为以后改共享部分时的回归检查

### 4. 下一步：玩法模板和零件库（10-26 定，待实现）

上面的「画面」层还要再收一层（见 `discussion-log.md` 10-26「玩」和「挑战」也做成通用的模板）：

- 玩法 = 规则（`Flow`）+ 每一步的画面定义 `present(状态) → 画面`，都是纯函数。画面是固定骨架：目标、台词、状态、舞台、提问、反馈、结果、按钮行。能点的东西带着要发的动作
- 零件库（每个平台只实现一次）：提问——大图标按钮（可排成十字）、选项卡、填数字、在舞台上点一个或多个、按顺序挑；场景——一排（可竖排）、可点的缝、网格、树、跑道/条形图、代码面板、记录、范围条。场景里每一项统一描述：外观、小字、标签、标记（变灰、高亮、透光、晃、闪、盖住）、点击动作
- 每关只留皮肤样式；零件画不出来的才登记自定义场景，审校时逐个看要不要做成新零件。子线程不自己造零件，缺零件报给主线程
- 绘本、逐步执行、猜下一步、找 bug 是同一模型上的现成模板
- 统一的效果图：尺寸、字号、间距以二分查找为准写成规格，各关统一过去（这是修正现在各关不一致，不算走样）；设计变量另出平台无关的 `tokens.json`；网站加零件样例页，列出每个零件各种状态的样子，作为所有平台的效果图
- 快照：文字和玩法必须不变；外观以零件规格为准
