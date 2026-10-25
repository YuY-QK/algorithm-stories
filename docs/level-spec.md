# 关卡规格

每个算法做成「看、玩、做、延伸」四步的小关卡。基调见 `docs/overview.md` 4a，冲突时以它为准。三层结构见 `AGENTS.md`。

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
