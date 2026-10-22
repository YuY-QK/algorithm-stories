# 算法小故事

目标：首先让 Yumor 自己把算法吃透，其次让孩子提前接触算法。每个算法是一个「看、玩、做」的小关卡：先看懂，再在玩的过程中练会。公开到 GitHub 和博客是顺带的。

## 背景

**先读 `docs/overview.md`**：项目的基调（为什么做、给谁、是什么），是所有决定的最高依据，其他文档和它冲突时以它为准。

项目起步时的讨论、决定和待办见 `docs/conversation-2026-10-20.md`，之后的规划、技术选型、建仓和部署讨论见 `docs/discussion-log.md`（开头是决策摘要和待办），开始新工作前先读这两份。整体规划、技术架构和分阶段路线图见 `docs/project-plan.md`。候选算法、故事点子和完成状态见 `docs/algorithm-catalog.md`，做完一个算法要同步更新它和根目录 `README.md`。

## 技术栈

网站：Astro + Vue 3 + TypeScript，静态网站，推到 `main` 后由 `.github/workflows/deploy.yml` 测试并部署到 GitHub Pages（`base` 是 `/algorithm-stories`，站内链接一律用 `import.meta.env.BASE_URL` 拼）。

练习：`exercises/` 是一个 Kotlin Gradle 项目，给 Yumor 在本地 IDE 里「亲手写」。`src/main/kotlin/<包>/` 放函数框架（`TODO()`），`src/test/kotlin/<包>/` 放测试，`solutions/<包>/` 放参考答案；CI 用 `./gradlew test -Psolutions` 检查测试本身没写错。

```
npm run dev / npm test / npm run test:py / npm run check / npm run build
cd exercises && ./gradlew test -Psolutions
```

## 三层结构

| 层 | 位置 | 规则 |
|---|---|---|
| 内容 | `content/algorithms/<slug>/` | `meta.json`（标题、分类、已做的步骤等，字段见 `src/content.config.ts`）、`notes.md` 资料、`story.md` 故事稿、`<name>.py` 参考实现加自测（内部和引擎对拍用） |
| 引擎 | `src/engine/<slug>.ts` | 纯函数，不碰 DOM、不依赖 Vue。看和玩的规则、逐步执行的 `buildTrace`、找 bug 的 bug 版本都在这里。步骤轨迹每一步继承 `src/engine/types.ts` 的 `Step`（`line` 代码行号、`note` 说明、`done`），`CODE` 是 Kotlin 代码 |
| 界面 | `src/demos/<slug>/` | `Demo.astro` 组织四步的面板，交互部分写成 Vue 组件，用 `client:only="vue"` 挂载。通用部分用 `src/components/shared/`：`usePlayer`、`Transport`、`CodePanel`（可点行，用于找 bug）、`VarChips`、`Segmented`、`LogCompare` |
| 练习 | `exercises/` | 每个算法一个 Kotlin 包：框架、测试、参考答案 |

`<slug>` 是算法英文名，短横线分隔。

## 新增一个算法

照二分查找这个样板关做（`src/demos/binary-search/`、`src/engine/binary-search.ts`、`exercises/.../binarysearch/`）。

1. `content/algorithms/<slug>/`：写 `meta.json`、`notes.md`、`story.md`、`<name>.py`
2. `src/engine/<slug>.ts`：引擎，参考代码的行号要和 `CODE` 数组一致
3. `tests/<slug>.test.ts`：大量随机输入检查每一步和最终结果；在 `tests/python-crosscheck.test.ts` 里加一段和 Python 对拍
4. `src/demos/<slug>/`：`Demo.astro` 加四步的 Vue 组件，用 `<Fragment slot="look|play|do|more">` 传给 `AlgoLayout`
5. `exercises/`：加一个包，放函数框架、测试和参考答案
6. 在 `src/demos/index.ts` 登记一行
7. 更新 `docs/algorithm-catalog.md` 和根目录 `README.md`

## 关卡结构

见 `docs/overview.md` 4a。每个算法四步，页面上是四个标签：

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

## Agent

`.claude/agents/` 下有四个 agent，新增一个算法按这个顺序走：

1. `algorithm-researcher`：整理资料，写 `notes.md`
2. `story-writer`：写故事稿 `story.md`
3. `demo-builder`：写引擎、测试、演示组件、Kotlin 练习和 Python 参考实现，并验证
4. `content-reviewer`：发布前审校，只报告问题
