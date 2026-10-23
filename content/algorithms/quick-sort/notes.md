# 快速排序：资料

## 1. 解决什么问题

把一组数据排成升序（或按任意比较规则排序）。它是实际中最常用的通用排序思路之一：平均速度快，原地，不需要额外的大块内存。同一个分区的办法还能解决「第 k 小」（快速选择）。

## 2. 核心思路（分治）

1. 在区间 `[lo, hi]` 里选一个**标杆**（pivot）。
2. **分区**：重新排列区间，使标杆左边的都比它小，右边的都不比它小，标杆落在中间的下标 `p`。这一步结束，标杆就站在了最终排好序以后的位置，以后不用再动。
3. 对 `[lo, p - 1]` 和 `[p + 1, hi]` 分别递归。区间里不足两个元素时直接返回。

本关卡用 **Lomuto 分区，每次拿区间最后一个元素当标杆**。理由：好画（标杆永远在最右边，不会乱跑）、好讲（i 是「矮队」的最右边，j 是「正在看的人」）、代码短。

```kotlin
fun quickSort(arr: IntArray, lo: Int = 0, hi: Int = arr.size - 1) {
    if (lo >= hi) return
    val p = partition(arr, lo, hi)
    quickSort(arr, lo, p - 1)
    quickSort(arr, p + 1, hi)
}

fun partition(arr: IntArray, lo: Int, hi: Int): Int {
    val pivot = arr[hi]
    var i = lo - 1
    for (j in lo until hi) {
        if (arr[j] < pivot) {
            i++
            swap(arr, i, j)
        }
    }
    swap(arr, i + 1, hi)
    return i + 1
}
```

分区的不变量（循环到 `j` 时）：`arr[lo..i]` 都比标杆小，`arr[i+1..j-1]` 都不比标杆小，`arr[j..hi-1]` 还没看过，`arr[hi]` 是标杆。循环结束后标杆和 `arr[i+1]` 交换。

### Lomuto 和 Hoare 两种分区

| | Lomuto（本关卡） | Hoare（原版） |
|---|---|---|
| 指针 | 一个扫描指针 j，一个「矮队末尾」i，都从左往右 | 两个指针从两端往中间走，遇到「左边的大、右边的小」就交换 |
| 标杆最终位置 | 返回的 p，标杆正好站在那里 | 返回的分界点，标杆**不一定**站在那里，递归区间要写成 `[lo, j]` 和 `[j + 1, hi]` |
| 交换次数 | 较多 | 平均约少三倍（据 Wikipedia「Quicksort」词条，待核实） |
| 好讲好画 | 是 | 否，边界很容易写错 |
| 全是相同的数 | 严格 `<` 时所有数都分到右边，退化成 O(n²) | 两个指针都会停在相等的数上，交换后各走一步，反而分得很均匀 |

## 3. 复杂度和性质

| 项目 | 值 |
|---|---|
| 时间（平均） | O(n log n)：随机排列时期望比较 `2(n+1)H_n − 4n` 次，约 1.39 · n · log₂n |
| 时间（最坏） | O(n²)：每次标杆都是最小或最大，比较 n(n − 1)/2 次。最后一个当标杆时，已经有序、完全倒序、全是相同的数（严格 `<`）都会这样 |
| 空间 | 原地，额外空间是递归栈：平均 O(log n)，最坏 O(n)。先递归短的一边、长的一边用循环，栈深保证不超过 log₂n |
| 稳定 | 否：分区时 `swap(arr, i, j)` 会让相等的元素越过彼此（例：`[2a, 2b, 1]`，标杆 1，分区后 `1` 被换到最前面，2a 和 2b 的顺序被换成了 2b、2a） |
| 自适应 | 否（固定取端点时，对有序数据反而最慢） |

**手算一个最坏情况**：已排好的 n 个数，最后一个当标杆。第一次分区比较 n − 1 次，标杆最大，左边 n − 1 个、右边 0 个；下一层 n − 2 次……一共 (n−1) + (n−2) + … + 1 = n(n−1)/2。n = 10 时是 45 次，n = 10000 时是 49,995,000 次。关卡里的挑战就是让用户预测这个数，三种输入（有序、倒序、全一样）答案都是 45。

**为什么均匀才快**：每层所有分区加起来比较约 n 次；标杆分得均匀时只有 log₂n 层，分得极偏时有 n 层。

## 4. 选标杆的办法和变种

- **固定取端点**（最右或最左）：最简单，但对有序数据是最坏情况。真实数据里「基本有序」非常常见，所以教学之外很少单独使用。
- **随机标杆**：随机挑一个换到端点再分区。没有哪种输入能稳定地让它退化。
- **三数取中**（median-of-three）：取最左、正中、最右三个数的中位数。对有序、倒序数据正好选到中间。
- **三路分区**（Dijkstra 荷兰国旗，Bentley–McIlroy）：分成 小于 / 等于 / 大于 三段，相等的一次站定。大量重复数据时是 O(n) 而不是 O(n²)（LeetCode 75「颜色分类」就是它）。
- **双轴快排**（Yaroslavskiy 等）：选两个标杆分三段，Java 7 起用于 `Arrays.sort` 的基本类型数组。
- **Introsort**（Musser，1997）：递归深度超过 2·log₂n 就切换成堆排序，把最坏情况压回 O(n log n)。
- **快速选择**（Hoare 的 Find，1961）：分区后只递归有答案的那一边。平均 O(n)，最坏 O(n²)；换成「中位数的中位数」选标杆可以做到最坏 O(n)，但常数大，很少用。
- **先递归短的一边**：短的一边递归，长的一边 `lo = p + 1` 之类的循环继续，栈深不超过 log₂n。

## 5. 易错点

**关卡「找 bug」讲了前三条**

1. 递归区间把标杆也带上：`quickSort(arr, lo, p)`。标杆是区间里最大的数时 `p == hi`，递归的区间和上一层一模一样，永远缩不小，`StackOverflowError`。正确写法左边 `[lo, p - 1]`，右边 `[p + 1, hi]`。
2. 比较写反：`arr[j] > pivot`。矮队装的是比标杆大的，整个数组排成从大到小。
3. 最后一步 `swap(arr, i, hi)`：应该是 `i + 1`。写成 `i` 会把矮队最后一个同学换到最右边，标杆占了他的位置；`i == -1`（没有比标杆小的）时直接下标越界。

**其他**

4. 忘记最后把标杆换到 `i + 1`，直接 `return i`/`return i + 1`：标杆还躺在 `hi`，分区的不变量不成立。
5. `for (j in lo..hi)`（多走了一步）：标杆自己也参与比较，`arr[hi] < pivot` 不成立所以不会乱换，但会多比较一次；写成 `lo until hi - 1` 则漏掉 `hi - 1`。
6. `if (lo > hi) return` 而不是 `lo >= hi`：区间只剩一个元素时还会分区一次，浪费，但结果仍然对；另一方面写成 `lo == hi` 会漏掉 `lo > hi` 的空区间，下标越界。
7. 用 `<=` 判断进矮队：`arr[j] <= pivot`。结果仍对，但全是相同的数时所有数进矮队，另一边为空，同样退化成 O(n²)，只是换了个方向。
8. 随机标杆没有先换到 `hi`：随机挑了 `r` 却只读 `arr[r]` 当 pivot，而分区仍然假设标杆在 `hi`，不变量被破坏。
9. 栈溢出：对有序数据递归深度是 n。JVM 默认栈大约能放几千到上万层（取决于帧大小和 `-Xss`），n 很大时会 `StackOverflowError`。
10. 三数取中算中点时，`(lo + hi) / 2` 里的 `lo + hi` 可能溢出，写 `lo + (hi - lo) / 2`。

## 6. 真实应用

**生活**

- 把一班同学按「比他矮 / 比他高」分成两队再分下去；把一堆货按价格分成「比这件便宜」「比这件贵」。

**工程**

- Java `Arrays.sort(int[])` 等基本类型数组用 `java.util.DualPivotQuicksort`（双轴快速排序，Yaroslavskiy、Bentley、Bloch 的算法）。已对照 OpenJDK 主线源码：类注释写明 `@since 1.7 * 14`（即 JDK 7 引入，JDK 14 重写）；小区间用插入排序（`MAX_INSERTION_SORT_SIZE = 44`、`MAX_MIXED_INSERTION_SORT_SIZE = 65`）；递归超过 `MAX_RECURSION_DEPTH` 时改用堆排序。Kotlin 的 `IntArray.sort()` 在 JVM 上调用 `java.util.Arrays.sort`（待核实具体版本的 stdlib 源码）。
- Java 对象数组和 `List.sort` 用稳定的 TimSort，不是快排。Python `list.sort` 也是 Timsort。
- C++ libstdc++ `std::sort` 是 introsort：快排 + 递归过深时换堆排序 + 区间 ≤ 16 时停手、最后整体做一遍插入排序（插入排序的资料里已核实 `_S_threshold = 16`）。
- Go 1.19 起 `sort` 包用 pdqsort（pattern-defeating quicksort，改良的快排，会识别有序、倒序、重复很多的情况）。Rust 的 `sort_unstable` 也是 pdqsort 一类；新版本改成了 ipnsort（从哪个版本开始，待核实）。
- 快速选择：C++ `std::nth_element` 在 libstdc++ 里是 introselect（快速选择 + 递归过深时的保底，待核实具体函数名）；LeetCode 215「数组中的第 K 个最大元素」的标准解法之一。

## 7. 关卡讲法建议

| 步骤 | 讲法 |
|---|---|
| 看 | 体育课排队：老师点最右边的同学当标杆 🚩，从左到右问「你比标杆矮吗」，矮的去左队，高的先留着，最后标杆换到两队中间站定。用 6 2 8 4 1 7 3 5 讲，第一次分区一个同学一页，之后每次分区一页，一共比较 14 次。 |
| 玩 | ① 站两边：标杆固定，孩子把每位同学点到左边或右边，点错了拉出和标杆一样高的线，让他自己比；② 挑个好标杆：孩子点任意同学当标杆，立刻看到两边各几个人，一边挤一边空时换一位，两次还没找到就让中间的同学透光，自己发现「选中间最好」。 |
| 做 | 逐步执行（i、j、pivot、调用栈）；猜下一步（j 指着的要不要换、换到哪、标杆落哪、递归哪两个区间）；找 bug（`quickSort(arr, lo, p)`、`>` 写反、`swap(arr, i, hi)`）；亲手写 `partition` / `quickSort` / `quickSelect`；挑战：预测「已排好 / 倒序 / 全一样」的 10 个数要比较几次（都是 45），再用表格对比三种选标杆的办法。 |
| 延伸 | 平均 O(n log n)、最坏 O(n²) 与怎么躲开、不稳定、原地、双轴快排和 introsort、快速选择。 |

## 8. 参考资料

- C. A. R. Hoare，「Algorithm 64: Quicksort」，Communications of the ACM 4(7)，1961；「Algorithm 65: Find」，同期
- Cormen 等，《算法导论》第 3 版第 7 章（快速排序，用的就是 Lomuto 分区）、9.2 节（期望线性时间的选择）
- Robert Sedgewick，《算法》第 4 版 2.3 节（用的是 Hoare 式分区和三向切分）
- David Musser，「Introspective Sorting and Selection Algorithms」，Software: Practice and Experience，1997
- OpenJDK 主线 `DualPivotQuicksort.java`：<https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/DualPivotQuicksort.java>
- Wikipedia「Quicksort」：<https://en.wikipedia.org/wiki/Quicksort>，「Quickselect」：<https://en.wikipedia.org/wiki/Quickselect>
- libstdc++ `stl_algo.h`：<https://github.com/gcc-mirror/gcc/blob/master/libstdc%2B%2B-v3/include/bits/stl_algo.h>
- LeetCode 912（排序数组）、215（数组中的第 K 个最大元素）、75（颜色分类）
