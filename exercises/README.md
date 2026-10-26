# 亲手写：Kotlin 练习

每个关卡「做」这一步里的「亲手写」都在这里。网页负责看、玩、猜下一步和找 bug，代码在自己电脑上写。

## 打开

用 IntelliJ IDEA 或 Android Studio 打开这个 `exercises/` 目录（不是仓库根目录），等 Gradle 同步完成。需要 JDK 17 以上。

## 每一关

| 关卡 | 要写的文件 | 运行测试 |
|---|---|---|
| 顺序查找 | `src/main/kotlin/linearsearch/LinearSearch.kt` | `./gradlew test --tests 'linearsearch.*'` |
| 二分查找 | `src/main/kotlin/binarysearch/BinarySearch.kt` | `./gradlew test --tests 'binarysearch.*'` |
| 哈希查找 | `src/main/kotlin/hashlookup/HashLookup.kt` | `./gradlew test --tests 'hashlookup.*'` |
| 冒泡排序 | `src/main/kotlin/bubblesort/BubbleSort.kt` | `./gradlew test --tests 'bubblesort.*'` |
| 选择排序 | `src/main/kotlin/selectionsort/SelectionSort.kt` | `./gradlew test --tests 'selectionsort.*'` |
| 插入排序 | `src/main/kotlin/insertionsort/InsertionSort.kt` | `./gradlew test --tests 'insertionsort.*'` |
| 归并排序 | `src/main/kotlin/mergesort/MergeSort.kt` | `./gradlew test --tests 'mergesort.*'` |
| 快速排序 | `src/main/kotlin/quicksort/QuickSort.kt` | `./gradlew test --tests 'quicksort.*'` |
| 栈 | `src/main/kotlin/stack/Stack.kt` | `./gradlew test --tests 'stack.*'` |
| 队列 | `src/main/kotlin/queue/RingQueue.kt`、`src/main/kotlin/queue/TwoStackQueue.kt` | `./gradlew test --tests 'queue.*'` |
| 广度优先搜索 | `src/main/kotlin/bfs/Bfs.kt` | `./gradlew test --tests 'bfs.*'` |
| 深度优先搜索 | `src/main/kotlin/dfs/Dfs.kt` | `./gradlew test --tests 'dfs.*'` |
| 贪心算法 | `src/main/kotlin/greedy/Greedy.kt` | `./gradlew test --tests 'greedy.*'` |
| 动态规划 | `src/main/kotlin/dp/DynamicProgramming.kt` | `./gradlew test --tests 'dp.*'` |
| LRU 缓存 | `src/main/kotlin/lru/Lru.kt` | `./gradlew test --tests 'lru.*'` |

1. 打开要写的文件，把 `TODO()` 换成你的代码。
2. 运行测试（命令行或 IDE 里测试类旁边的绿色三角）。
3. 全绿就过关。红了看失败信息，里面写着输入和期望的结果。

测试在 `src/test/kotlin/` 里，可以读，但别改。参考答案在 `solutions/`，自己写完、测试通过以后再去对照。

## 检查参考答案

```
./gradlew test -Psolutions
```

用参考答案跑同一套测试，CI 也用它确认测试本身没写错。
