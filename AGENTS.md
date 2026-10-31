# 算法小故事

开始工作前先读 `docs/overview.md`（项目基调，最高依据）和 `docs/progress.md`（现状、计划、待办）。超过一个文件的改动，先对照 progress.md 的计划；计划里没有的，先和 Yumor 确认。

目标：首先让 Yumor 自己把算法吃透，其次让孩子提前接触算法。每个算法是一个「看、玩、做」的小关卡：先看懂，再在玩的过程中练会。公开到 GitHub 和博客是顺带的。

## 文档

- `docs/conversation-2026-10-20.md`、`docs/discussion-log.md`：项目起步和之后的讨论、决定（需要来龙去脉时再读）
- `docs/project-plan.md`：整体规划、技术架构、路线图
- `docs/algorithm-catalog.md`：候选算法、故事点子、完成状态。做完一个算法要同步更新它和根目录 `README.md`
- `docs/level-spec.md`：新增算法的步骤、关卡结构、页面约定

## 技术栈

网站：Astro + Vue 3 + TypeScript，静态网站，推到 `main` 后由 `.github/workflows/deploy.yml` 测试并部署到 GitHub Pages（`base` 是 `/algorithm-stories`，站内链接一律用 `import.meta.env.BASE_URL` 拼）。推到 `preview` 分支则部署预览版到 `/algorithm-stories/preview/`（构建时设 `SITE_BASE`），用来在合并前看最新代码的效果：`git push origin HEAD:preview --force`。

练习：`exercises/` 是一个 Kotlin Gradle 项目，给 Yumor 在本地 IDE 里「亲手写」。`src/main/kotlin/<包>/` 放函数框架（`TODO()`），`src/test/kotlin/<包>/` 放测试，`solutions/<包>/` 放参考答案；CI 用 `./gradlew test -Psolutions` 检查测试本身没写错。

```
npm run dev / npm test / npm run test:py / npm run check / npm run build
cd exercises && ./gradlew test -Psolutions
node scripts/check-pages.cjs <页面地址> --each '[role=tab]'   # 页面检查，只出文字报告，不看截图
```

## 分层

新增一关 = 配置 + 规则 + 画面，流程全部共享（详见 `docs/level-spec.md` 末节）。

| 层 | 位置 | 规则 |
|---|---|---|
| 配置 | `content/algorithms/<slug>/` | `meta.json`（字段见 `src/content.config.ts`）、`level.json`（四步各有哪些块，格式见 `src/core/level.ts`）、`copy.zh.json`（全部给人看的字）、`more.zh.md`（延伸阅读）、`notes.md` 资料、`story.md` 故事稿；早期关卡另有 `<name>.py` 对拍（新关卡不再写） |
| 规则 | `src/engine/<slug>.ts` | 纯函数，不碰 DOM、不依赖 Vue，只产出 `Msg`（文案键 + 参数）。导出 Kotlin `CODE` 和 `level: LevelModule`（看、逐步执行、猜下一步、找 bug、小游戏的规则） |
| 流程 | `src/core/` | 纯 TS 的接口（`types.ts`）、`level.json` 校验、文案 `t()`、各种状态机（`flows/`）、速度（`timing.ts`）、共用文案。各关不写流程代码 |
| 主题 | `src/theme/tokens.json` | 颜色、圆角、阴影、字体、速度的唯一来源，`npm run gen:theme` 生成 `src/styles/tokens.css` |
| 界面 | `src/ui/` | 只有这一层和平台有关。`vue/LevelPage.astro` 按 `level.json` 组装页面；`vue/widgets/` 通用控件；`vue/shared/` 底层零件（`usePlayer`、`Transport`、`CodePanel`、`VarChips`、`Segmented`……）；`vue/scenes/<slug>/` 每关的画面和注册表 `index.ts`（自动收集）。画面只收 props、emit `act`，不放流程 |
| 练习 | `exercises/` | 每个算法一个 Kotlin 包：框架、测试、参考答案 |

`<slug>` 是算法英文名，短横线分隔。

新增算法的步骤、四步关卡怎么做、页面约定，见 `docs/level-spec.md`。

## Agent

`.claude/agents/` 下有四个 agent，新增一个算法按这个顺序走：

1. `algorithm-researcher`：整理资料，写 `notes.md`
2. `story-writer`：写故事稿 `story.md`
3. `demo-builder`：写配置、规则、画面、测试和 Kotlin 练习，并验证
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
