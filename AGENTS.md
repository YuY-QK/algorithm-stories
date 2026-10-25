# 算法小故事

开始工作前先读 `docs/overview.md`（项目基调，最高依据）和 `docs/progress.md`（现状、计划、待办）。超过一个文件的改动，先对照 progress.md 的计划；计划里没有的，先和 Yumor 确认。

目标：首先让 Yumor 自己把算法吃透，其次让孩子提前接触算法。每个算法是一个「看、玩、做」的小关卡：先看懂，再在玩的过程中练会。公开到 GitHub 和博客是顺带的。

## 文档

- `docs/conversation-2026-10-20.md`、`docs/discussion-log.md`：项目起步和之后的讨论、决定（需要来龙去脉时再读）
- `docs/project-plan.md`：整体规划、技术架构、路线图
- `docs/algorithm-catalog.md`：候选算法、故事点子、完成状态。做完一个算法要同步更新它和根目录 `README.md`
- `docs/level-spec.md`：新增算法的步骤、关卡结构、页面约定

## 技术栈

网站：Astro + Vue 3 + TypeScript，静态网站，推到 `main` 后由 `.github/workflows/deploy.yml` 测试并部署到 GitHub Pages（`base` 是 `/algorithm-stories`，站内链接一律用 `import.meta.env.BASE_URL` 拼）。

练习：`exercises/` 是一个 Kotlin Gradle 项目，给 Yumor 在本地 IDE 里「亲手写」。`src/main/kotlin/<包>/` 放函数框架（`TODO()`），`src/test/kotlin/<包>/` 放测试，`solutions/<包>/` 放参考答案；CI 用 `./gradlew test -Psolutions` 检查测试本身没写错。

```
npm run dev / npm test / npm run test:py / npm run check / npm run build
cd exercises && ./gradlew test -Psolutions
node scripts/check-pages.cjs <页面地址> --each '[role=tab]'   # 页面检查，只出文字报告，不看截图
```

## 三层结构

| 层 | 位置 | 规则 |
|---|---|---|
| 内容 | `content/algorithms/<slug>/` | `meta.json`（标题、分类、已做的步骤等，字段见 `src/content.config.ts`）、`notes.md` 资料、`story.md` 故事稿；早期关卡另有 `<name>.py` 参考实现，用于和引擎对拍（新关卡不再写，见 `docs/level-spec.md`） |
| 引擎 | `src/engine/<slug>.ts` | 纯函数，不碰 DOM、不依赖 Vue。看和玩的规则、逐步执行的 `buildTrace`、找 bug 的 bug 版本都在这里。步骤轨迹每一步继承 `src/engine/types.ts` 的 `Step`（`line` 代码行号、`note` 说明、`done`），`CODE` 是 Kotlin 代码 |
| 界面 | `src/demos/<slug>/` | `Demo.astro` 组织四步的面板（`src/demos/index.ts` 自动收集，不用登记），交互部分写成 Vue 组件，用 `client:only="vue"` 挂载。通用部分用 `src/components/shared/`：`usePlayer`、`Transport`、`CodePanel`（可点行，用于找 bug）、`VarChips`、`Segmented`、`LogCompare` |
| 练习 | `exercises/` | 每个算法一个 Kotlin 包：框架、测试、参考答案 |

`<slug>` 是算法英文名，短横线分隔。

新增算法的步骤、四步关卡怎么做、页面约定，见 `docs/level-spec.md`。

## Agent

`.claude/agents/` 下有四个 agent，新增一个算法按这个顺序走：

1. `algorithm-researcher`：整理资料，写 `notes.md`
2. `story-writer`：写故事稿 `story.md`
3. `demo-builder`：写引擎、测试、演示组件和 Kotlin 练习，并验证
4. `content-reviewer`：发布前审校，只报告问题

## 子线程

主线程负责调度，子线程负责干活。

- 按难度选模型：设计和把关由主线程自己做；写关卡用 sonnet；只读盘点和跑检查用 haiku；不给子线程用 opus。
- 同时开几个并不减少总用量，一般 1～2 个。剩余额度不够做完一个任务，就不开新的。
- 一个子线程最多交两个相近的关卡。
- 主线程只读子线程交回的总结，不重读它写的全部代码。合并后本地只跑一次快速检查（`npm test`、`npm run check`），完整测试交给 CI。
- 「待核实」条目和审校每批统一做一次，不逐个关卡做。
- 阶段中间不发进度。阶段结束汇报一次并更新 `docs/progress.md`；对话变长时提醒 Yumor 换新会话。
- 子线程不看截图，用 `scripts/check-pages.cjs` 看文字报告；主线程在阶段结束时抽看一两张就行。
