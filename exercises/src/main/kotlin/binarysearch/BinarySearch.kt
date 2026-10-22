package binarysearch

/*
 * 关卡：二分查找「小邮差找信箱」
 *
 * 把下面两个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'binarysearch.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 */

/**
 * 在升序、没有重复的数组 [arr] 里找 [target]，返回它的下标；找不到返回 -1。
 */
fun binarySearch(arr: IntArray, target: Int): Int {
    TODO("写你的二分查找")
}

/**
 * 变种：返回第一个大于等于 [target] 的下标；所有元素都比 [target] 小时返回 arr.size。
 * [arr] 升序，可能有重复。
 *
 * 例子：arr = [1, 3, 3, 5]
 *   lowerBound(arr, 3) = 1    lowerBound(arr, 4) = 3    lowerBound(arr, 9) = 4
 *
 * 提示：把范围写成左闭右开 [lo, hi)，想清楚循环什么时候停、mid 要不要留在范围里。
 */
fun lowerBound(arr: IntArray, target: Int): Int {
    TODO("写 lowerBound")
}
