package bubblesort

/*
 * 关卡：冒泡排序「排队拍合照」
 *
 * 把下面两个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'bubblesort.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 */

/**
 * 把 [arr] 原地从小到大排好。
 *
 * 规则：从左往右比较相邻的两个，左边的大就交换；每走一轮，最大的那个冒到末尾。
 * 某一轮一次都没换，说明已经排好，提前结束。
 *
 * 例子：[120, 145, 118, 132, 138] → [118, 120, 132, 138, 145]
 */
fun bubbleSort(arr: IntArray) {
    TODO("写你的冒泡排序")
}

/**
 * 变种：按 [comparator] 把 [list] 原地排好，返回一共交换了几次。
 *
 * 要求：
 * - 稳定：comparator 认为相等的两个元素，排完保持原来的先后顺序。
 * - 提前退出：一轮没换就停。已经排好的 n 个元素只能调用 comparator n - 1 次。
 *
 * 例子：按分数排 [(小兔, 90), (小熊, 80), (小猫, 90)]
 *   → [(小熊, 80), (小兔, 90), (小猫, 90)]，交换 1 次。小兔原来在小猫前面，排完也在前面。
 *
 * 提示：comparator.compare(a, b) > 0 表示 a 应该排在 b 后面。等于 0 的时候换不换？
 */
fun <T> bubbleSortWith(list: MutableList<T>, comparator: Comparator<in T>): Int {
    TODO("写 bubbleSortWith")
}
