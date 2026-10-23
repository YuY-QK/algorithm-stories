# 插入排序：资料

## 1. 解决什么问题

把一组数据排成升序（或按任意比较规则排序）。特别适合：数据量很小、数据已经几乎有序、数据一个一个陆续到来（在线排序）。

## 2. 核心思路

1. 把数组分成左右两部分：左边 `[0, i)` 已经排好，右边还没排。一开始 `i = 1`（只有一个元素当然有序）。
2. 取出 `key = arr[i]`，下标 `i` 空出来。
3. `j` 从 `i - 1` 往左走：只要 `arr[j] > key`，就把它往右挪一格（`arr[j + 1] = arr[j]`），空位跟着左移。
4. 遇到 `arr[j] <= key` 或者 `j` 走到 -1 时停下，空位在 `j + 1`，把 `key` 放进去。
5. `i++`，重复，直到 `i == n`。

```kotlin
fun insertionSort(arr: IntArray) {
    for (i in 1 until arr.size) {
        val key = arr[i]
        var j = i - 1
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j]
            j--
        }
        arr[j + 1] = key
    }
}
```

## 3. 复杂度和性质

| 项目 | 值 |
|---|---|
| 时间（最好：已经有序） | O(n)：比较 n − 1 次，挪 0 次 |
| 时间（最坏：完全倒序） | O(n²)：比较和挪动都是 n(n − 1)/2 次 |
| 时间（平均：随机排列） | O(n²)：挪动次数的期望是 n(n − 1)/4（每一对元素逆序的概率是 1/2） |
| 空间 | O(1)，原地排序 |
| 稳定 | 是：只挪严格大于 `key` 的元素，相等的元素不会越过彼此 |
| 自适应 | 是：挪动次数恰好等于逆序对数，几乎有序时接近 O(n) |
| 在线 | 是：可以边接收数据边排序 |

**挪动次数 = 逆序对数**：每次 `arr[j + 1] = arr[j]` 恰好把一对「前大后小」的元素（`arr[j]` 和 `key`）摆正，而且不会产生新的逆序对。所以总挪动次数等于原数组的逆序对数。比较次数 = 挪动次数 + （没有挪到最左边的轮数），在 n − 1 和 n(n − 1)/2 之间。

## 4. 常见变种和易错点

**变种**

- **二分插入排序**：用二分查找在已排好的部分里找插入位置，比较次数降到 O(n log n)，但挪动次数不变，总时间仍是 O(n²)。要保持稳定，得找「第一个大于 key 的位置」（upper bound），不是 lower bound。CPython 和 Java TimSort 的小数组部分都用它。
- **希尔排序**：先按较大的间隔做插入排序，再逐步缩小间隔到 1，让元素先「跳着」大致归位。
- **链表插入排序**：链表不用挪元素，只改指针，但找位置只能从头顺序走（LeetCode 147）。
- **哨兵**：先把最小的元素换到 `arr[0]`，内层循环就可以省掉 `j >= 0` 的判断。libstdc++ 的 `__unguarded_linear_insert` 就是这种「无边界检查」写法。

**易错点**（演示页「找 bug」讲了前三条）

1. 循环条件写成 `j > 0`：下标 0 永远不参加比较，最小的元素到不了最前面。
2. 比较写成 `arr[j] >= key`：结果数值仍然正确，但相等元素会互换，排序不再稳定，还多挪几次。
3. 最后写成 `arr[j] = key`：循环停下时空位在 `j + 1`。写成 `arr[j]` 会覆盖一个有效元素，`j == -1` 时下标越界。
4. 先写 `arr[j] = key`（或在循环里交换）而没有先保存 `key`：`arr[i]` 在第一次挪动时就被覆盖，`key` 丢了。所以必须先 `val key = arr[i]`。
5. 外层循环从 `i = 0` 开始不会出错，只是多一轮空转；从 `i = 2` 开始会漏掉前两个元素的顺序。

## 5. 真实应用

**生活**

- 理扑克牌、按身高排队、把新单据插进一摞按日期排好的单据里。

**工程**（小区间改用插入排序，以下数字已对照源码核实）

- Java 8 `java.util.DualPivotQuicksort`（`Arrays.sort(int[])` 等基本类型数组）：`INSERTION_SORT_THRESHOLD = 47`，长度小于它时用插入排序。较新的 OpenJDK 主线重写了这个类，常量改为 `MAX_INSERTION_SORT_SIZE = 44` 和 `MAX_MIXED_INSERTION_SORT_SIZE = 65`（从哪个 JDK 版本开始改的，待核实，一般认为是 JDK 14）。
- Java `java.util.TimSort`（对象数组、`List.sort`）：`MIN_MERGE = 32`，长度小于 32 时不归并，直接用二分插入排序 `binarySort`。
- CPython `list.sort`（Timsort，见 `Objects/listsort.txt`）：元素少于 64 个时整个列表用二分插入排序；更长时，短于 minrun 的自然 run 也用二分插入排序补长。
- C++ libstdc++ `std::sort`（introsort）：`_S_threshold = 16`，快排把区间切到 16 以内就停手，最后 `__final_insertion_sort` 对整个数组做一遍插入排序。
- Go `sort.Sort` / `slices.Sort`（pdqsort）：长度不超过 12 的区间用插入排序（`maxInsertion = 12`，见 `src/sort/zsortinterface.go`）。

为什么小数组用它：常数因子小、没有递归和额外内存、对缓存友好，n 很小时 n² 的劣势体现不出来。

## 6. 关卡讲法建议

| 步骤 | 讲法 |
|---|---|
| 看 | 小熊理纸牌：手里的牌排好，摸一张新牌，从右往左比，大的往右挪，插进空位。用 4 2 5 1 3 讲，一共挪 6 次。 |
| 玩 | ① 找位置：孩子点出新牌该插的空隙，插错时左右邻居晃一晃比大小；② 挪一挪：孩子自己一张一张挪牌，每挪一次往罐子里放一枚硬币，最后数数挪了几次。 |
| 做 | 逐步执行（key、j、空位、比较/挪动次数）；猜下一步（key 落在哪、这轮比较几次）；找 bug（`j > 0`、`>=`、`arr[j] = key`）；亲手写 `insertionSort` 和稳定的二分插入排序；挑战：四组数组比赛，预测谁最快谁最慢。 |
| 延伸 | 最好 O(n)、最坏 O(n²)、挪动次数 = 逆序对数、稳定、标准库小区间的阈值。 |

## 7. 参考资料

- OpenJDK 8 `DualPivotQuicksort.java`：<https://github.com/openjdk/jdk8u/blob/master/jdk/src/share/classes/java/util/DualPivotQuicksort.java>
- OpenJDK 主线 `DualPivotQuicksort.java`：<https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/DualPivotQuicksort.java>
- OpenJDK `TimSort.java`：<https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/TimSort.java>
- CPython `listsort.txt`：<https://github.com/python/cpython/blob/main/Objects/listsort.txt>
- libstdc++ `stl_algo.h`：<https://github.com/gcc-mirror/gcc/blob/master/libstdc%2B%2B-v3/include/bits/stl_algo.h>
- Go `sort/zsortinterface.go`：<https://github.com/golang/go/blob/master/src/sort/zsortinterface.go>
- Cormen 等，《算法导论》第 3 版 2.1 节（插入排序）、思考题 2-4（逆序对）
- Donald Knuth，《计算机程序设计艺术》第 3 卷 5.2.1 节
