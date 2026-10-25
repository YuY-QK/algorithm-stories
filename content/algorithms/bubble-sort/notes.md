# 冒泡排序：资料

## 1. 解决什么问题

把一组可以比较大小的数据从小到大排好。它是最容易理解的排序算法之一，主要价值在于教学：比较、交换、稳定性、复杂度、提前退出，都能在它身上看得清清楚楚。

## 2. 核心思路

1. 从左到右依次比较相邻的两个元素 `arr[j]` 和 `arr[j + 1]`。
2. 左边的比右边大就交换。
3. 走完一轮，没排好的部分里最大的那个一定被换到了最右边，位置固定。原因：这一轮里「目前最大的数」一旦被碰到，每次比较都比右边大（或相等时换成带右边那个同样大的），一路被带到末尾。
4. 对还没固定的部分重复，每轮少看一个：第 i 轮（从 0 数）只比到 `n - 1 - i`。
5. 某一轮一次都没交换，说明每一对相邻元素都已经左小右大，整个数组有序，提前结束。

关卡里用的 Kotlin 版本（和网页「做」的代码一致）：

```kotlin
fun bubbleSort(arr: IntArray) {
    val n = arr.size
    for (i in 0 until n - 1) {
        var swapped = false
        for (j in 0 until n - 1 - i) {
            if (arr[j] > arr[j + 1]) {
                val t = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = t
                swapped = true
            }
        }
        if (!swapped) break
    }
}
```

## 3. 复杂度和性质

| 项目 | 值 |
|---|---|
| 时间（最好） | O(n)：已经有序时只走一轮，比较 n − 1 次（需要 `swapped` 提前退出） |
| 时间（平均、最坏） | O(n²)：最坏（逆序）比较和交换都是 n(n − 1)/2 次 |
| 交换次数 | 恰好等于逆序对个数（i < j 且 a[i] > a[j] 的对数），每次相邻交换正好消掉一个逆序对 |
| 空间 | O(1)，原地排序 |
| 稳定性 | 稳定（比较用 `>`，相等时不交换） |
| 适应性 | 有提前退出时，对「每个元素离最终位置都不远、尤其不需要往左挪很多」的数据很快；但一个小数排在末尾时，它每轮只能往左挪一格（俗称「乌龟」），仍要走很多轮 |

具体数字：5 个元素最坏比较 10 次，100 个 4950 次，1 万个约 5000 万次，10 万个约 50 亿次。

一轮里的交换次数也有规律：这一轮要比较的范围里，左边出现过比它大的数的元素，各会被「目前最大的数」越过一次，所以交换次数 = 这类元素的个数。「做」的「猜下一步」用了这一点。

## 4. 常见变种和易错点

**变种**

- 提前退出：记录一轮里有没有交换（关卡用的就是这个版本）。
- 记录最后一次交换的位置：它之后的部分都已有序，下一轮只需比到那里。
- 鸡尾酒排序（双向冒泡）：一轮从左往右，下一轮从右往左，能更快地把末尾的小数挪回来。
- 奇偶排序（odd-even transposition sort）：交替比较所有 (偶, 奇) 下标对和 (奇, 偶) 下标对，同一步里的比较互不相干，适合并行。

**易错点**（具体到代码；「找 bug」选了前三个，都能在动画里看出错）

1. 交换不用临时变量：写成 `arr[j] = arr[j + 1]; arr[j + 1] = arr[j]`，第二句读到的已经是新值，原来左边的数丢了，数组里出现重复的数。（关卡坑 1）
2. 内层循环上界写成 `until n - i`：第一轮 j 走到 n − 1，读 `arr[j + 1]` 就是 `arr[n]`，JVM 上抛 `ArrayIndexOutOfBoundsException`。写成 `until n - 1` 不会出错，只是每轮都把已经站好的也比一遍，多做无用比较。（关卡坑 2）
3. 比较写成 `>=`：相等时也交换，排序不再稳定；排整数看不出来，排对象时同值的元素先后顺序会乱。另外有相等邻居时往往每轮都换过，提前退出常常失效。（关卡坑 3）
4. 比较写反成 `<`：排成了从大到小。
5. `swapped = false` 放到外层循环外面（不在每一轮开头重置）：一旦换过就一直是 true，提前退出永远不生效，结果仍正确但最好情况退化成 O(n²)。这个错要改两行，不符合「只差一行」，没放进找 bug。
6. 外层循环写成 `0 until n`：多走一轮，不出错但多余（有提前退出时通常影响不到）。

## 5. 真实应用

**生活**

- 排队拍合照、按身高站队、整理书架：手动排序时人们常常就是「看相邻两个，不对就换」。

**工程**

- 真正排序时几乎不用它。Kotlin 在 JVM 上：
  - `IntArray.sort()` 调用 `java.util.Arrays.sort(int[])`，JDK 文档写明是 Vladimir Yaroslavskiy、Jon Bentley、Joshua Bloch 的双轴快速排序（Dual-Pivot Quicksort）。
  - `MutableList.sort()` / `sortWith()` 调用 `java.util.Collections.sort`（只在 size > 1 时调用），Kotlin 标准库注释写明是稳定排序。`Arrays.sort(Object[])` 和 `Arrays.sort(T[], Comparator)` 的 JDK 文档写明是「稳定的、自适应的迭代归并排序」，改编自 Tim Peters 给 Python 写的 list.sort（TimSort）。
  - `sorted()` / `sortedBy()` 对集合先 `toTypedArray()` 再排，走同一条对象排序的路。（Kotlin 标准库源码）
- 小片段用插入排序：TimSort 对短片段用二分插入排序，双轴快排对很短的区间也改用插入排序（阈值随 JDK 版本不同；JDK 14 起的 `DualPivotQuicksort` 里常量是 44 和 65）。插入排序和冒泡一样只在相邻位置挪动、同样稳定，但比较次数少得多，所以工程里「小而几乎有序」的场景用的是插入排序，不是冒泡。
- Knuth 在《计算机程序设计艺术》第 3 卷 5.2.2 节评价冒泡排序：除了一个好记的名字和它引出的一些有趣理论问题之外，没什么值得推荐的（大意，原文 "the bubble sort seems to have nothing to recommend it, except a catchy name and the fact that it leads to some interesting theoretical problems"，经 Astrachan 论文转引）。

## 6. 关卡讲法建议

| 步骤 | 讲法 |
|---|---|
| 看 | 5 个高矮不同的小动物排队拍合照，摄影师 👀 每次只看挨着的两个，高的在左就换。固定队伍：小兔 120、小熊 145、小猫 118、小狗 132、小猴 138。第 1 轮小熊从第 2 位一路冒到最右边（换 3 次），第 2 轮换 1 次，第 3 轮一次没换，提前拍照。共比较 9 次、交换 4 次，能看到「冒泡」和「提前退出」两个要点。 |
| 玩 ① | 当摄影师：孩子点 🔄 或 👍 判断眼前这一对换不换；判断不对时高的那个透光、左边的摇一摇。一轮没人换时问「还要再看一轮吗」，选「再看」时这一轮的交换计数（0）闪光。 |
| 玩 ② | 谁会冒到最右边：每轮开始前点出这一轮会站到最右边（还没站好的部分）的那个，点对了才播放这一轮。点错摇一摇，同一轮第二次点错答案透光。 |
| 做 | 逐步执行（Kotlin，带 swapped、临时变量 t 三行交换）；猜下一步（这一轮谁落到末尾、这一轮交换几次）；找 bug（缺临时变量、`until n - i` 越界、`>=` 不稳定）；亲手写 `bubbleSort` 和泛型的 `bubbleSortWith`（返回交换次数）；挑战：只用相邻交换以最少次数排好（= 逆序对数 = 冒泡的交换次数）。 |
| 延伸 | O(n²) 和 n·log n 的对比、最好情况 O(n)、稳定性、交换次数 = 逆序对、Kotlin/JVM 标准库用什么、常见变种。 |

## 7. 参考资料

- Kotlin 标准库 `MutableCollectionsJVM.kt`（`sort`、`sortWith` 调用 `java.util.Collections.sort`）：<https://github.com/JetBrains/kotlin/blob/master/libraries/stdlib/jvm/src/kotlin/collections/MutableCollectionsJVM.kt>
- OpenJDK `java.util.Arrays` 源码和文档注释（`sort(int[])` 双轴快排；`sort(Object[])` 稳定的 TimSort）：<https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/Arrays.java>
- Owen Astrachan, "Bubble Sort: An Archaeological Algorithmic Analysis"（SIGCSE 2003）：<https://users.cs.duke.edu/~ola/papers/bubble.pdf>
- Donald Knuth，《计算机程序设计艺术》第 3 卷 5.2.2 节
- Wikipedia: Bubble sort：<https://en.wikipedia.org/wiki/Bubble_sort>
