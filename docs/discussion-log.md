# 讨论记录（2026-10-21 至 2026-10-22）

这份记录整理自 Claude 项目「算法小故事」里的项目聊天和几个讨论串，接在 [conversation-2026-10-20.md](conversation-2026-10-20.md) 之后。新会话开始前先读「决策摘要」，需要来龙去脉再看后面的时间线。

---

## 决策摘要

> **10-22 晚更新**：重新确定了项目基调，写在 [overview.md](overview.md)，优先于下面的内容。要点：首先为了自己吃透算法，其次让孩子提前接触；用户就是自己和孩子；每个算法是一个「看、玩、做」的小关卡，孩子停在「玩」，自己走到「做」。下面的「下一步」和待办要按基调重新讨论。

**目标**：让学习算法变得简单有趣。每个算法一个小故事，应用到具体场景，配可交互网页演示，发布到 GitHub 和各类博客。分四级：初级（小朋友）、进阶（初学者）、中级（在校生、转行者）、高级（IT 从业者）。

**已定**

| 事项 | 决定 | 时间 |
|---|---|---|
| 架构升级 | 趁只有 2 个算法，P0 就从单文件 HTML 升级到 Astro | 10-22 |
| 前端框架 | Astro + Vue 3 + TypeScript（没选 React，因为 Yumor 熟悉 Vue；没选 Flutter，见下文） | 10-22 |
| 分层 | 内容（Markdown、Python）、引擎（纯函数）、界面（Vue）三层分开，以后做客户端只需重写界面层 | 10-22 |
| 客户端路线 | 手机 App 用 Capacitor 打包，电脑客户端用 Tauri；暂不做 | 10-22 |
| GitHub 仓库 | <https://github.com/YuY-QK/algorithm-stories>，公开 | 10-22 |
| 仓库描述 | 用小故事和可交互演示学算法，从小朋友到工程师分级学习 \| Learn algorithms through stories and interactive demos, for kids to engineers. | 10-22 |
| 许可证 | 代码 MIT（沿用 GitHub 建仓时生成的 LICENSE），内容 CC BY-NC-SA 4.0（`LICENSE-CONTENT.md`） | 10-22 |
| 部署 | GitHub Pages，Source 选 GitHub Actions，推到 `main` 自动测试并部署到 <https://yuy-qk.github.io/algorithm-stories/> | 10-22 |

**名字**：仓库名定为 `algorithm-stories`。应用名还没最终确认，推荐「算法小镇 AlgoTown」做应用名，「算法小故事」做博客系列名（如「算法小镇 · 算法小故事 第 3 篇：小老鼠走迷宫」）。商标、域名占用情况还没查。

**进度**：P0 已完成（[PR #1](https://github.com/YuY-QK/algorithm-stories/pull/1) 已合并，网站已部署）。已做的算法：二分查找「小邮差找信箱」、冒泡排序「排队拍合照」，都只有初级和高级两档。

**下一步**：进入 P1，先做 BFS 走迷宫，检验新架构对网格、图类算法是否好用。

**待办和待定**
- 冒泡排序故事稿里「嵌入式或图形程序会用冒泡的思路」一句找不到可靠出处，`notes.md` 里已标「待核实」。建议换成插入排序的例子，等 Yumor 回复。
- 请 Yumor 打开网站确认首页有两个算法卡片、初级和高级都能玩（Claude 这边访问不了 github.io）。
- Yumor 的 Mac 上 `/Users/yu/Work/AppsWp/algorithm` 还不是 git 仓库，建议重新 `git clone` 仓库替代它。
- [project-plan.md](project-plan.md) 第 9 节还有 5 个待定问题：网站域名、博客首发平台、初级年龄段、是否做英文版、两个原型的反馈。
- 应用名最终确认。

---

## 时间线

### 10-21 晚：检查项目初始化

**Yumor**：检查目录是否已经初始化了，配置了相关 agent，如果初始化了，继续进行这个项目。

**结果**：本地目录已有结构、README、CLAUDE.md、对话记录和二分查找示例，但没配 agent，也没 `git init`。于是：
- 新增 4 个 agent（`.claude/agents/`）：`algorithm-researcher` → `story-writer` → `demo-builder` → `content-reviewer`
- 写了 `docs/algorithm-catalog.md`：6 类约 30 个算法，每个配故事点子、等级和状态
- 做了第二个算法冒泡排序「排队拍合照」：初级是帮摄影师判断相邻两人换不换位置；高级是逐步执行、代码高亮、随机 / 几乎有序 / 逆序输入、比较次数对比
- 验证：Python 自测通过，演示逻辑对 3000 组随机数组和参考实现一致
- 建议下一个做 BFS 走迷宫

### 10-21 晚：先做整体规划

**Yumor**：现在先不着急开发新的算法，先制定一个整个项目应用的计划，把架构和蓝图先规划出来。

**结果**：写了 [docs/project-plan.md](project-plan.md)，包括产品定位、四个等级和统一的「故事 → 动画 → 动手 → 代码」页面结构、三层技术架构、内容生产流程和「完成」标准、GitHub 和博客发布方案、P0 到 P4 路线图。核心建议是趁只有 2 个算法，先升级到 Astro，否则 30 个算法要复制几十遍同样的样式和播放器代码。同时发现两个算法缺 `notes.md`。第 9 节列了待决定的问题。

### 10-22 上午：起名

**Yumor**：帮我给这个应用起一个贴切的名字。

**候选**

| 中文名 | 英文 / 仓库名 | 优点 | 不足 |
|---|---|---|---|
| 算法小镇 | AlgoTown / `algo-town` | 每个算法是镇上的角色或店铺，等级地图就是小镇地图，适合游戏化和 App | 偏可爱，工程师可能觉得是儿童产品 |
| 算法故事会 | AlgoTales / `algo-tales` | 最贴合「每个算法一个故事」 | 「故事会」是知名杂志名，可能有商标问题 |
| 一步一算 | StepByStep Algo / `step-algo` | 呼应逐步演示 | 看不出故事和好玩 |
| 算法小故事 | Algorithm Stories / `algorithm-stories` | 直白，搜索友好 | 作为 App 名偏平 |

推荐「算法小镇」做应用名，「算法小故事」做博客系列名。

### 10-22 上午：多会话怎么用

**Yumor**：一个长会话上下文可能过长，想在一个目录下新建多个会话，要单独建目录还是能拆分？

**回答**：不用新建目录。在项目聊天里每提一个新任务就会开一个独立讨论串，各有自己的上下文，共享项目文件和项目记忆。同一件事在同一个讨论串里继续聊，换话题就回项目聊天说一句。

### 10-22 上午：创建 GitHub 仓库并推送

**Yumor**：想在 GitHub 上创建项目，名字选 algorithm-stories，描述等怎么选？

**建议**：描述用中英双语（见摘要），选 Public，README / .gitignore / license 三个都不勾（本地已有，避免首次推送冲突）。About 里加 Topics：`algorithms` `data-structures` `visualization` `education` `interactive` `kids-coding` `chinese`，Website 等 Pages 上线后再填。

**过程**：Yumor 建好仓库后，先后做了 Connect GitHub、按项目组织重新连接、安装 Claude GitHub App 并勾选 `algorithm-stories`，之后推送成功：19 个文件进了 `main`。GitHub 建仓时已生成 MIT LICENSE，沿用未覆盖，另加 `LICENSE-CONTENT.md`。

### 10-22 中午：P0 技术选型

Yumor 要求一步一步推进，于是逐个确认规划第 9 节的问题。

**问题 1：现在就升级成 Astro 吗？** Yumor 选了「现在升级」。

**问题 2：React 还是 Vue？**

**Yumor**：我直接用 Flutter 是不是更好呢？如果后面要扩展到客户端的话，选择 Vue+TS 是不是有局限呢？

**分析**：不建议 Flutter。前期主战场是网页和博客，Flutter Web 首次加载要下载 2MB 以上渲染引擎；内容画在画布上，搜索引擎抓不到；现有 JS 原型要用 Dart 重写。Vue + TS 走 Capacitor 可以打包 iOS、Android，Tauri 可以打包电脑客户端，教育类 App 性能足够；唯一局限是没有 React Native 那样成熟的纯原生方案，但 React 走 Capacitor 时差别也很小。

**Yumor**：Vue 也熟悉，但我希望的是扩展，是不是我现在想得太早了呢？后面如果真的做到客户端，是不是也不麻烦呢？

**分析**：扩展性靠三层分离保证，跟框架关系不大。手机 App 用 Capacitor 打包代码基本不改，主要是图标、启动页和审核，约一两周；电脑客户端用 Tauri 差不多；真要纯原生，内容和引擎原样复用，只重写界面层，选 React 或 Vue 都一样。既然熟悉 Vue，建议 Vue + TS，自己能看懂和改代码更重要。

**Yumor**：ok。定为 Astro + Vue + TypeScript。

### 10-22 中午：P0 落地

- 搭好 Astro + Vue + TS 骨架、测试、共享主题；引擎数据格式和通用播放器组件
- 迁移二分查找和冒泡排序（初级、高级），引擎各跑 2000 组随机测试并和 Python 对拍
- 新增首页和故事集；浏览器实测手机和电脑、浅色和深色
- GitHub Pages 自动部署流程；更新 CLAUDE.md、agent 说明和规划
- 给两个算法补 `notes.md`；整理资料时发现冒泡故事稿里那句待核实的话
- 开 [PR #1](https://github.com/YuY-QK/algorithm-stories/pull/1)，CI 全部通过后合并

**Yumor**：请你在内置浏览器中打开 GitHub，帮我操作完成。

当时的会话用不了内置浏览器，用接口开启 Pages 也被拦住，所以请 Yumor 手动在 Settings → Pages 把 Source 选成 GitHub Actions。

**Yumor**：我改成 actions 了，然后呢？

重新部署成功，网站上线 <https://yuy-qk.github.io/algorithm-stories/>。P0 完成，下一步 P1 做 BFS 走迷宫。

### 10-22 下午：换到新的 Claude Code 会话

**Yumor**：我想要把这个会话和项目重新在一个新的 code 会话中处理，该怎么做？

**回答**：在 Claude Code 新建会话并添加仓库 `YuY-QK/algorithm-stories`，新会话会读 CLAUDE.md 和 docs 下的文档。要在 Mac 上继续改，就 `git clone` 仓库替代旧文件夹。

**Yumor**：我想要把讨论记录也都带到新会话中，怎么做？

**结果**：整理成本文件，并在 CLAUDE.md 里加了指向。

### 10-22 晚：重新确定项目基调

**Yumor**：先不着急做具体实现，要讨论项目规划。

Claude 先列了一串细节问题（先广度还是深度、找谁试玩、首发平台等）。

**Yumor**：太细了，整体框架还没定好，我只有最初的一个想法，现在有些乱，没有清晰的总览，希望先理清整个项目的基调。

于是按「为什么做 → 给谁 → 是什么 → 怎么做」四层从上往下谈，指出之前的讨论几乎都在第 4 层。

**为什么做**。**Yumor**：都想做，主要还是希望自己能吃透，也想让孩子能提前了解和学习算法，其他是辅助。

**给谁**。**Yumor**：孩子基本都识字了，但希望多用图标，弱化文字，孩子对图形更容易接受，操作要简单易用。自己吃透是说有学习、有实践、有习题，但平时看书经常看不太明白，还懒得做习题，可能是不够有趣。

**是什么**。Claude 提出：自己和孩子要的是同一样东西，先看懂，再在玩的过程中练会；每个算法是「看、玩、做」三步的小关卡，习题做成关卡（猜下一步、找 bug、亲手写、挑战）。**Yumor**：对的。

**结果**：写成 [overview.md](overview.md)，作为最高依据；project-plan.md 和本文件摘要加了指向。第 4 层「怎么做」待下次讨论。

### 10-22 晚：「做」用什么语言

开始谈第 4 层，拆成 4a 关卡模板、4b 语言和在哪写、4c 先拿二分查找做样板关、4d 顺序节奏。

**Yumor**：用 Kotlin / Java 呢？TS 会一点点，但不是很熟悉，和 JS 是不是一样？

**回答**：TS 是 JS 加类型标注。既然 Kotlin 最熟，就用 Kotlin，学算法时不必同时学新语言。Kotlin 不能直接在网页里跑，所以网页负责看、玩和不写代码的练习，亲手写放在本地 IDE，靠测试判断过关。

**Yumor**：日常用 Kotlin；本地写加测试可以。已记入 [overview.md](overview.md) 4b。

### 10-22 晚：关卡模板和二分查找样板关

Claude 用二分查找画了样板关草图：看（绘本动画）→ 玩（孩子当小邮差）→ 做（猜下一步、找 bug、亲手写、挑战）→ 延伸阅读。

**Yumor**：孩子可能会调皮，心里想的和实际点的不一致，能不能把答案预置上去、盖起来？

**回答**：这个问题出在「孩子心里想数、邮差来猜」那版。改成孩子先把信放进信箱盖上叶子，再给邮差指路，指错时信箱透光提示。「孩子当小邮差」那版信由程序藏好，不存在这个问题。建议两个都做。

**Yumor**：两个都做没问题。玩法一动画会不会太复杂？而且引导式更适合发展孩子的思维。

**回答**：不复杂，主要是简单的位移和渐变，费工夫的是画面。「引导式」作为所有「玩」的原则：用提示和追问让孩子自己发现，不直接给答案也不放任乱点。**Yumor**：是的。已记入 [overview.md](overview.md) 4a。
