# 关卡规格

每个算法做成「看、玩、做、延伸」四步的小关卡。基调见 `docs/overview.md` 4a，冲突时以它为准。分层见 `AGENTS.md` 和本文末节；设计的来龙去脉见 `docs/refactor-plan.md`。

## 新增一个算法

新增一关 = **配置**（页面结构 + 文案 + 延伸阅读）+ **规则**（引擎，纯 TS）+ **画面**（只负责画）。流程（翻页、逐步执行、猜下一步、找 bug、小游戏的回合与反馈、计时）都是共享的，新关卡不写流程代码。

照二分查找这个样板关做：`content/algorithms/binary-search/`、`src/engine/binary-search.ts`、`src/ui/vue/scenes/binary-search/`、`tests/binary-search.*.test.ts`、`exercises/.../binarysearch/`。

1. `content/algorithms/<slug>/`：
   - `meta.json`、`notes.md`、`story.md`
   - `level.json`：四步各有哪些块（类型、图标、指向的规则和画面），格式见 `src/core/level.ts`，构建时校验
   - `copy.zh.json`：这一关所有给人看的字，键 → 模板
   - `more.zh.md`：延伸阅读
2. `src/engine/<slug>.ts`：规则。只产出 `Msg`（文案键 + 参数），不拼中文；导出 `CODE`（行号和 `Step.line` 一致）和 `level: LevelModule`（`look`、`trace`、`predict`、`bugs`、`games` 各组规则，接口见 `src/core/types.ts`）
3. `src/ui/vue/scenes/<slug>/`：画面组件，加一个 `index.ts` 默认导出 `{ engine, scenes }`（画面注册表，`level.json` 里的 `scene` 名字 → 组件）。自动收集，不用在别处登记
4. 测试：
   - `tests/<slug>.test.ts`：大量随机输入检查每一步和最终结果。最终结果要和一个**独立的标准答案**比：语言自带的函数（如 `Array.prototype.sort`），或测试里另写的最朴素做法（暴力枚举、逐个比较），不能拿引擎自己的函数当答案
   - `tests/<slug>.games.test.ts`：小游戏和挑战的规则，「玩」的每条引导（摇头、透光、追问、秘诀、星星）都要有用例
   - `tests/<slug>.copy.test.ts`：跑遍引擎产生的 `Msg`，缺键为空，文案表里没有用不到的键（照二分查找的写法，工具在 `tests/helpers/copy.ts`）
5. `exercises/`：加一个包，放函数框架、测试和参考答案
6. 更新 `docs/algorithm-catalog.md` 和根目录 `README.md`（由主线程统一做）

**为什么不再写 Python**：同一个算法原本写三遍（TS 引擎、Python、Kotlin 参考答案）。Python 的作用只是给引擎对拍，第 4 步的独立标准答案能起同样的作用，还少一个文件、少一套运行环境。早期关卡的 `<name>.py` 和 `tests/<slug>.crosscheck.test.ts` 保留，不回头删。

## 关卡结构

每个算法四步，页面上是四个标签：

| 步骤 | level.json 的键 | 给谁 | 内容 |
|---|---|---|---|
| 看 | `look` | 孩子和大人 | 会动的绘本，每个画面最多一行字，画面由引擎生成 |
| 玩 | `play` | 孩子停在这里 | 一到两个小游戏，孩子当主角 |
| 做 | `do` | 大人继续 | 逐步执行、猜下一步、找 bug、亲手写（本地 Kotlin）、挑战 |
| 延伸 | `more` | 通关以后 | 复杂度、真实世界里的用法 |

「玩」的原则：引导式。用提示和追问让孩子自己发现规律，不直接给答案，也不放任乱点；答案预先固定，孩子没法耍赖；做错时给看得见的提示（晃一下、透出光），不说「错了」；以图标和动画为主，文字只做提示，能点就不拖。

## 页面约定

- 颜色、圆角、阴影、字体、速度的唯一来源是 `src/theme/tokens.json`；改了要运行 `npm run gen:theme` 重新生成 `src/styles/tokens.css`（有测试检查两者一致）。速度和停顿从 `src/core/timing.ts` 引用，不自己写数字
- 用 CSS 变量，不写死颜色；画面独有的样式写在组件的 `<style scoped>` 里。`src/styles/theme.css` 里有不少全局类名（如 `.num`、`.tag`、`.idx`、`.say`、`.note`、`.result`、`.oops-box`、`.dots`），scoped 样式挡不住它们，起类名前先搜一下
- 同时支持浅色和深色主题，手机宽度（375px）下不横向滚动
- 语言：简体中文。给人看的文字一律进文案表，引擎和组件里不写中文（注释和给开发者看的报错除外）
- `prototypes/` 是最早的单文件原型，只做参考，不再修改

## 分层（阶段 R，2026-10-31 定稿）

```
content/algorithms/<slug>/   数据：level.json、copy.zh.json、more.zh.md（谁都能读的 JSON / Markdown）
src/engine/<slug>.ts         规则：纯 TS，只产出 Msg
src/core/                    流程：纯 TS，不碰 DOM、不依赖 Vue
  types.ts                     Msg、Outcome、Control、LookRules、TraceRules、PredictRules、BugRules、GameRules、LevelModule
  level.ts                     level.json 的类型和校验
  i18n.ts                      t(msg, copy)：把 Msg 填成文字
  flows/                       player、predict、bughunt、game、transport 的状态机
  timing.ts、copy.zh.json      速度常量（读 tokens.json）、共用文案（键以 ui. 开头）
src/theme/tokens.json        主题：唯一来源，生成 src/styles/tokens.css
src/ui/                      界面：只有这一层和平台有关
  levelData.ts、mini-md.ts     构建时读一关的配置、文案、Markdown
  vue/LevelPage.astro          按 level.json 组装页面，src/pages/algo/[slug].astro 只调它
  vue/widgets/                 Book、Trace、Predict、BugHunt、Game、Controls：只认核心层接口，不认识具体算法
  vue/shared/                  底层零件：usePlayer、Transport、CodePanel、VarChips、Segmented、BookPager、PredictFrame、Block、LogCompare、sound
  vue/scenes/<slug>/           每关的画面和注册表
```

规矩：

- **规则**只产出 `Msg` 和状态，不知道有页面；**流程**只认 `src/core/types.ts` 的接口；**画面**只收 props、emit `act`，不放计时器、不放台词、不判断对错
- 「玩」和「挑战」一律写成 `GameRules`：`start` 里把答案定死（孩子没法耍赖），做错的提示（晃、透光、摇头）通过 `Outcome` 表达，追问和星星通过 `result` 表达
- 随机源一律作为最后一个参数 `rand` 注入（默认 `Math.random`），组件里不许直接 `Math.random`，测试用 `tests/helpers/seeded.ts` 固定种子
- 块标题和说明不写在 level.json，按约定从文案表取：`<id>.title`、`<id>.intro`（可没有）、`<id>.goal`（「玩」开头的目标提示，可没有）；小游戏的开场白不要叫 `.intro`
- 共享接口不够用时，先看 `docs/refactor-plan.md` 7.6 有没有现成的字段；确实要加，只加可选字段、不改旧字段，并在总结里写明，由主线程登记到 7.6
- 换平台只重写 `src/ui/`；换语言只加 `copy.<语言>.json` 和 `more.<语言>.md`
