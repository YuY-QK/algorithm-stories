# 归并排序：资料

## 1. 解决什么问题

把一组数据排成升序（或按任意比较规则排序）。特别适合：要求最坏情况也有保证的 O(n log n)、要求稳定、数据在链表或磁盘上（不能随机访问或装不进内存）。

## 2. 核心思路（分治）

1. 分：把区间 `[lo, hi)` 从 `mid = (lo + hi) / 2` 分成左半 `[lo, mid)` 和右半 `[mid, hi)`。
2. 治：递归地把两半各自排好。区间长度不超过 1 时已经有序，直接返回（递归出口）。
3. 合：用两个指针 `i`（左半队头）、`j`（右半队头），每次把较小的放进临时数组 `tmp`；一边用完后，另一边剩下的直接接上；最后把 `tmp` 抄回 `a[lo, hi)`。

```kotlin
fun mergeSort(a: IntArray, lo: Int = 0, hi: Int = a.size) {
    if (hi - lo <= 1) return
    val mid = (lo + hi) / 2
    mergeSort(a, lo, mid)
    mergeSort(a, mid, hi)
    val tmp = IntArray(hi - lo)
    var i = lo
    var j = mid
    var k = 0
    while (i < mid && j < hi) {
        if (a[i] <= a[j]) tmp[k++] = a[i++]
        else tmp[k++] = a[j++]
    }
    while (i < mid) tmp[k++] = a[i++]
    while (j < hi) tmp[k++] = a[j++]
    tmp.copyInto(a, lo)
}
```

调用结构：n 个元素正好 2n − 1 次调用（n 个叶子，n − 1 个内部节点），n − 1 次合并，递归深度 `1 + ceil(log2 n)`。

## 3. 复杂度和性质

| 项目 | 值 |
|---|---|
| 时间（最好、平均、最坏） | 都是 Θ(n log n)：log₂n 层，每层合并的元素总数是 n |
| 比较次数 | 合并 l 个和 r 个：最少 min(l, r)，最多 l + r − 1。n = 8 时整体最少 12 次，最多 17 次（项目里用 Python 穷举 8! 种排列核对过） |
| 空间 | O(n) 临时数组，加 O(log n) 递归栈 |
| 稳定 | 是：两边队头相等时取左边（`<=`） |
| 自适应 | 朴素版不是（有序时也要分、合，只是每次合并比较得少）；TimSort 是 |
| 链表 | 很适合：合并只改指针，不需要额外数组 |

比较次数上下限的递推（项目里已用穷举验证 n ≤ 8）：`min(n) = min(⌊n/2⌋) + min(⌈n/2⌉) + ⌊n/2⌋`，`max(n) = max(⌊n/2⌋) + max(⌈n/2⌉) + n − 1`。最坏情况的构造：把 1..n 倒着「拆开」，奇偶下标分到左右两边，递归地这样做（n 为 2 的幂时每层合并都交错）。

**逆序对**：合并时，若右边的数比左边队头小而先走，它比左边**剩下的每一个**都小，贡献「左边剩余个数」对逆序对。所以归并排序能在 O(n log n) 数出逆序对数（暴力 O(n²)）。

## 4. 常见变种和易错点

**变种**

- **自底向上（迭代）**：不用递归，先合并长度 1 的相邻段，再合并长度 2、4、8……
- **链表归并排序**：快慢指针找中点，递归，再合并两条有序链表（LeetCode 148、21）。
- **多路归并**：一次合并 k 个有序序列，用最小堆挑队头（LeetCode 23）。外部排序的核心。
- **优化**：小区间改用插入排序；合并前检查 `a[mid-1] <= a[mid]` 就跳过；复用同一个辅助数组避免反复分配。
- **TimSort**：找已有的有序片段（run），短的用二分插入排序补长，再按规则合并，并用「galloping」加速。

**易错点**（演示页「找 bug」讲了前三条）

1. 合并比较写成 `a[i] < a[j]`：相等时取了右边，不稳定。数字排对了，带标签的相等元素换了顺序。
2. `tmp.copyInto(a, 0)` 而不是 `a, lo`：`lo == 0`（最左边那一段）时碰巧是对的，处理右半时结果盖在了最左边，数据丢失。很容易漏测。
3. 递归出口写成 `hi - lo < 1`：区间只剩 1 个时没有返回，`mid = lo`，右半 `[mid, hi)` 又是原区间，无限递归，`StackOverflowError`。
4. 忘了拷贝某一边剩下的元素（漏掉两个尾部 while 之一）：丢数。
5. `mid` 的取法让两半重叠（比如左半 `[lo, mid]` 含端点、右半 `[mid, hi)`），元素被重复处理；闭区间写法下 `lo + hi` 在 Int 可能溢出，用 `lo + (hi - lo) / 2`（本关卡用 `[lo, hi)`，数组下标不会到 2³¹，写 `(lo + hi) / 2` 可以）。
6. 每次递归都 `new` 一个数组，性能差；更好是只分配一个 n 大小的辅助数组反复用。

## 5. 真实应用

**生活**

- 把两摞已经按日期排好的单据合成一摞；两个班的队伍合成一队。

**工程**

- Java `java.util.TimSort`（已核对源码注释）：`Arrays.sort(Object[])`、`List.sort` 等对象排序使用；类注释写道它是「A stable, adaptive, iterative mergesort that requires far fewer than n lg(n) comparisons when running on partially sorted arrays」，`MIN_MERGE = 32`，不足 32 个直接二分插入排序。Kotlin 在 JVM 上对 `List` 排序（`sorted()`、`sortedBy`）最终走 `java.util.Collections.sort` / `Arrays.sort`，因此是稳定的（调用链细节待核实）。
- Java 的基本类型数组 `Arrays.sort(int[])`：双轴快排，不稳定但对基本类型无所谓（见插入排序 notes）。
- CPython `list.sort`：Timsort（见 `Objects/listsort.txt`），作者 Tim Peters。
- 外部排序：数据比内存大时，切成块分别排好写盘，再 k 路归并。数据库的排序操作、MapReduce 的 shuffle 排序/归并、GNU `sort` 处理大文件都使用这一思路（GNU sort 用临时文件做归并：待核实具体实现）。
- Linux 内核 `lib/list_sort.c` 对链表用归并排序：待核实（读取源码时被限流）。
- Rust `slice::sort`（稳定排序）：基于归并的 driftsort，自 1.81 起：待核实。

## 6. 关卡讲法建议

| 步骤 | 讲法 |
|---|---|
| 看 | 两章。一、一班 2 5 6 和二班 1 3 4 已经排好，每次只比队头合成一队（比 4 次）。二、倒回去看：5 2 6 1 4 3 一直对半分到每队一个，再两两合并回去。 |
| 玩 | ① 合并两队：孩子每次点两个队头里更矮的，点错了被点的摇一摇、更矮的透光；一边走光后剩下的自动跟上。② 拆一拆：孩子点 ✂️ 把每一队从正中间切开，一轮一轮切到每队一个，再数一数切了几轮（8 个 3 轮，4 个 2 轮）。切歪了先让左右两边亮起来数数，再歪一次正中间的 ✂️ 透光。 |
| 做 | 逐步执行（区间、mid、深度、调用栈、tmp、i/j/k）；猜下一步（下一个来自哪边、递归下一个处理哪个区间）；找 bug（`<`、`copyInto(a, 0)`、出口 `< 1`）；亲手写 `merge`、`mergeSort`、`countInversions`；挑战：把 1~8 排成一队，让比较次数最多（17）或最少（12）。 |
| 延伸 | 最坏也是 O(n log n)、O(n) 额外空间、稳定、TimSort、外部排序、链表、多路归并。 |

## 7. 参考资料

- OpenJDK `TimSort.java`：<https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/TimSort.java>
- CPython `listsort.txt`：<https://github.com/python/cpython/blob/main/Objects/listsort.txt>
- Cormen 等，《算法导论》第 3 版 2.3 节（分治法、归并排序）、思考题 2-4（逆序对）
- Donald Knuth，《计算机程序设计艺术》第 3 卷 5.2.4 节（归并排序）、5.4 节（外部排序）
- LeetCode 21 合并两个有序链表、23 合并 K 个升序链表、148 排序链表、315 / 493 / 剑指 Offer 51（逆序对）
