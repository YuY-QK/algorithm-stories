package linearsearch

/*
 * 关卡：顺序查找「一个个开箱子找小熊」
 *
 * 把下面两个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'linearsearch.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 */

/**
 * 在 [arr] 里从头往后找 [target]，返回第一个等于它的下标；找不到返回 -1。
 * [arr] 不要求有序，可能有重复，元素可以是 0 或负数。
 *
 * 例子：arr = [3, 7, 3]
 *   linearSearch(arr, 3) = 0    linearSearch(arr, 7) = 1    linearSearch(arr, 9) = -1
 *
 * 提示：找到就马上 return；别用 0 表示「找不到」，0 也是一个真正的下标。
 */
fun linearSearch(arr: IntArray, target: Int): Int {
    TODO("写你的顺序查找")
}

/**
 * 变种：哨兵版。结果和 [linearSearch] 完全一样，但循环里只做一件事：比较 arr[i] 是不是目标。
 *
 * 做法：
 *   1. 把末尾元素记下来，再把 [target] 放到末尾当「哨兵」，这样循环一定会停下，不用检查有没有走出数组；
 *   2. 从头扫到第一个等于 target 的位置；
 *   3. 把末尾元素还原。调用结束后 [arr] 的内容必须和调用前一样；
 *   4. 判断停下的位置是真找到的，还是只撞上了哨兵（只有最后一个位置，并且原来的末尾元素不是目标时才是撞哨兵）。
 *
 * 注意空数组：没有末尾可放哨兵，直接返回 -1。
 */
fun linearSearchSentinel(arr: IntArray, target: Int): Int {
    TODO("写哨兵版顺序查找")
}
