# 二分查找：资料

## 1. 解决什么问题

在**已经排好序**的一组数据里，快速找到某个值在哪里，或者确定它不存在。

## 2. 核心思路

1. 用 `lo`、`hi` 两个下标圈出「目标可能在的范围」，一开始是整个数组。
2. 看范围正中间的元素 `arr[mid]`。
3. 等于目标就找到了。
4. 比目标小，目标只可能在右半边，`lo = mid + 1`；比目标大，`hi = mid - 1`。
5. 范围变空（`lo > hi`）还没找到，说明不存在。

## 3. 复杂度和性质

| 项目 | 值 |
|---|---|
| 时间（最好） | O(1)，第一次就猜中 |
| 时间（平均、最坏） | O(log n)，最坏比较 ⌊log₂n⌋ + 1 次 |
| 空间 | 迭代写法 O(1)；递归写法 O(log n) 的调用栈 |
| 前提 | 数据有序，并且能按下标随机访问（数组可以，链表不行） |

具体数字：100 个元素最多 7 次，100 万个最多 20 次，10 亿个最多 30 次。

## 4. 常见变种和易错点

**变种**

- 找第一个大于等于目标的位置（lower bound）、第一个大于目标的位置（upper bound）。Python 的 `bisect.bisect_left` / `bisect_right`、C++ 的 `std::lower_bound` / `std::upper_bound` 就是这两个。
- 有重复元素时找第一个或最后一个等于目标的位置。
- 「答案二分」：答案本身有单调性时，对答案的取值范围二分（例如「最少需要几辆车才能一天运完」）。
- 在旋转过的有序数组里查找。

**易错点**（演示页高级档讲了前三条）

1. 数组无序时不会报错，只会返回错的结果。
2. 循环条件写成 `lo < hi`（配合 `hi = len - 1`）会漏掉只剩一个元素的情况。
3. 中点写成 `(lo + hi) / 2` 在 C、Java 里可能整数溢出，应写成 `lo + (hi - lo) / 2`。Java 标准库的 `Arrays.binarySearch` 曾有这个 bug，2006 年由 Joshua Bloch 公开说明并修复。
4. 更新边界写成 `lo = mid` 或 `hi = mid`（而循环条件又是 `lo <= hi`）会死循环。区间是闭区间还是半开区间，循环条件和边界更新要配套。

## 5. 真实应用

**生活**

- 翻字典、翻电话簿：先翻到中间，再决定往前还是往后。
- 猜数字游戏、调热水器温度时「太烫往回调一半」。

**工程**

- `git bisect`：在一串提交里二分定位是哪一次引入了 bug，几千个提交只需十几次测试。
- 标准库：Python `bisect` 模块、Java `Arrays.binarySearch`、C++ `std::lower_bound`。
- 数据库和存储引擎：B+ 树在每个节点内部、LSM 树（如 LevelDB、RocksDB）在有序的 SSTable 里查找键时都用二分（页内的键是有序的，可以二分定位；具体引擎也可能在页内顺序扫描）。

## 6. 分级讲法建议

| 等级 | 讲法 |
|---|---|
| 初级 | 小邮差找信箱：用户心里想一个号码，小邮差每次猜中间，信箱一半一半变暗。（已完成） |
| 进阶 | 给出打乱的步骤卡片（「看中间」「比大小」「丢掉一半」「范围空了就停」），让用户拼出正确的顺序，再在 16 个信箱上验证。 |
| 中级 | 代码填空：补全循环条件和边界更新；故意给一个写成 `lo < hi` 的版本，让用户找出漏掉的那个输入。 |
| 高级 | 逐步执行、指针和代码同步、顺序查找对比、三个坑。（已完成）可以再加 lower bound 变种和 `git bisect` 实例。 |

## 7. 参考资料

- Python `bisect` 模块文档：<https://docs.python.org/3/library/bisect.html>
- Joshua Bloch, "Extra, Extra - Read All About It: Nearly All Binary Searches and Mergesorts are Broken"（Google Research Blog，2006）：<https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/>
- `git bisect` 文档：<https://git-scm.com/docs/git-bisect>
- Donald Knuth，《计算机程序设计艺术》第 3 卷 6.2.1 节
