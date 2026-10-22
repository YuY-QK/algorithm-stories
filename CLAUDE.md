# 算法小故事

目标：让学习算法变得简单有趣。每个算法做成一个小故事，应用到具体场景，并配可交互的网页演示，最终发布到 GitHub 和各类博客。

## 背景

**先读 `docs/overview.md`**：项目的基调（为什么做、给谁、是什么），是所有决定的最高依据，其他文档和它冲突时以它为准。

项目起步时的讨论、决定和待办见 `docs/conversation-2026-10-20.md`，之后的规划、技术选型、建仓和部署讨论见 `docs/discussion-log.md`（开头是决策摘要和待办），开始新工作前先读这两份。整体规划、技术架构和分阶段路线图见 `docs/project-plan.md`。候选算法、故事点子和完成状态见 `docs/algorithm-catalog.md`，做完一个算法要同步更新它和根目录 `README.md`。

## 技术栈

Astro + Vue 3 + TypeScript，静态网站，推到 `main` 后由 `.github/workflows/deploy.yml` 测试并部署到 GitHub Pages（`base` 是 `/algorithm-stories`，站内链接一律用 `import.meta.env.BASE_URL` 拼）。

```
npm run dev / npm test / npm run test:py / npm run check / npm run build
```

## 三层结构

| 层 | 位置 | 规则 |
|---|---|---|
| 内容 | `content/algorithms/<slug>/` | `meta.json`（标题、分类、已做的等级等，字段见 `src/content.config.ts`）、`notes.md` 资料、`story.md` 故事稿、`<name>.py` 参考实现加自测 |
| 引擎 | `src/engine/<slug>.ts` | 纯函数，不碰 DOM、不依赖 Vue。高级档用 `buildTrace` 输出步骤轨迹，每一步继承 `src/engine/types.ts` 的 `Step`（`line` 代码行号、`note` 说明、`done`） |
| 界面 | `src/demos/<slug>/` | `Demo.astro` 组织各等级面板，交互部分写成 Vue 组件，用 `client:only="vue"` 挂载。通用部分用 `src/components/shared/`：`usePlayer`、`Transport`、`CodePanel`、`VarChips`、`Segmented`、`LogCompare` |

`<slug>` 是算法英文名，短横线分隔。

## 新增一个算法

1. `content/algorithms/<slug>/`：写 `meta.json`、`notes.md`、`story.md`、`<name>.py`
2. `src/engine/<slug>.ts`：引擎，参考代码的行号要和 `CODE` 数组一致
3. `tests/<slug>.test.ts`：大量随机输入检查每一步和最终结果；在 `tests/python-crosscheck.test.ts` 里加一段和 Python 对拍
4. `src/demos/<slug>/`：`Demo.astro` 加各等级的 Vue 组件，等级用 `<Fragment slot="kid|beginner|mid|pro">` 传给 `AlgoLayout`
5. 在 `src/demos/index.ts` 登记一行
6. 更新 `docs/algorithm-catalog.md` 和根目录 `README.md`

## 分级

- 初级（`kid`）：小朋友，故事加点选和拖拽，不写代码
- 进阶（`beginner`）：初学者，可视化加逻辑拼接
- 中级（`mid`）：在校生和转行者，可视化加简单代码
- 高级（`pro`）：IT 从业者，逐步执行、代码、复杂度对比、工程应用

同一个算法在不同等级重复出现，只是深度不同。

## 页面约定

- 配色、字体和通用控件在 `src/styles/theme.css`，用里面的 CSS 变量，不写死颜色；算法独有的画面样式写在组件的 `<style scoped>` 里
- 同时支持浅色和深色主题，手机宽度（375px）下不横向滚动
- 语言：简体中文
- `prototypes/` 是最早的单文件原型，只做参考，不再修改

## Agent

`.claude/agents/` 下有四个 agent，新增一个算法按这个顺序走：

1. `algorithm-researcher`：整理资料，写 `notes.md`
2. `story-writer`：写故事稿 `story.md`
3. `demo-builder`：写引擎、测试、演示组件和 Python 参考实现，并验证
4. `content-reviewer`：发布前审校，只报告问题
