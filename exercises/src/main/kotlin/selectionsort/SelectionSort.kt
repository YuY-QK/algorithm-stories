package selectionsort

/*
 * 关卡：选择排序「小熊排糖果」
 *
 * 把下面两个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'selectionsort.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 */

/**
 * 原地把 [arr] 从小到大排好（不返回新数组）。
 *
 * 做法：第 i 轮从下标 i 往后找最小的（记下它的下标 minIdx），再和 arr[i] 交换。
 * 一共 n − 1 轮，最后一个不用挑。
 *
 * 例子：[5, 2, 6, 1, 4, 3]
 *   第 1 轮挑出 1，和 5 交换 → [1, 2, 6, 5, 4, 3]
 *   第 2 轮挑出 2，它已经在最前面，不用换 → ……
 *
 * 提示：内层循环从哪里开始？和谁比：arr[i] 还是 arr[minIdx]？交换时要不要临时变量？
 */
fun selectionSort(arr: IntArray) {
    TODO("写你的选择排序")
}

/**
 * 变种：返回 [arr] 里第 [k] 小的数（k 从 1 开始，1 ≤ k ≤ arr.size）。可以修改 [arr]。
 *
 * 不用整个排完：选择排序第 k 轮结束时，arr[k - 1] 就已经是第 k 小了，所以只做 k 轮。
 * k 很小的时候（比如找前 3 名），只要比较大约 k × n 次。
 *
 * 例子：arr = [7, 2, 9, 2, 5]
 *   kthSmallest(arr, 1) = 2    kthSmallest(arr, 2) = 2    kthSmallest(arr, 3) = 5
 */
fun kthSmallest(arr: IntArray, k: Int): Int {
    TODO("写 kthSmallest")
}
