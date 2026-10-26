package quicksort

/*
 * 关卡：快速排序「体育课排队」
 *
 * 把下面三个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'quicksort.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 *
 * 建议按顺序写：partition 是核心，quickSort 和 quickSelect 都是在它上面搭起来的。
 */

/**
 * 分区（Lomuto 写法）：以 arr[hi] 当标杆，把 arr[lo..hi] 分成三段，返回标杆最后所在的下标 p。
 *   arr[lo until p]       都比标杆小
 *   arr[p]                就是标杆，它已经站在最终的位置上
 *   arr[p + 1..hi]        都不比标杆小（相等的也在右边）
 * 只能动 lo..hi 之内的元素。
 *
 * 例子：arr = [6, 2, 8, 4, 1, 7, 3, 5]，partition(arr, 0, 7)
 *   标杆是 5，分完 arr = [2, 4, 1, 3, 5, 7, 6, 8]（左边四个的顺序可以不同），返回 4
 *
 * 提示：用 i 记住「比标杆小的那一队」的最右边（一开始是 lo - 1）；j 从 lo 走到 hi - 1，
 * 遇到比标杆小的，就让 i 加一，再把 arr[i] 和 arr[j] 换一下；最后把标杆换到 i + 1。
 */
fun partition(arr: IntArray, lo: Int, hi: Int): Int {
    TODO("写 Lomuto 分区")
}

/**
 * 把 [arr] 原地排成升序。
 *
 * 例子：arr = [6, 2, 8, 4, 1, 7, 3, 5] → [1, 2, 3, 4, 5, 6, 7, 8]
 *
 * 提示：对 arr[lo..hi] 分区得到 p，标杆已经站好，不要再带上它，只对 [lo, p - 1] 和 [p + 1, hi] 各排一次。
 * 区间里不足两个元素时直接返回。
 *
 * 想一想：测试里会给 3000 个已经排好的数，还有 3000 个全一样的数。
 * 如果每次都用最后一个当标杆，会发生什么？（网页上「挑战」那一关讲过。）可以换一个标杆再分区，
 * 比如随机挑一个，先和 arr[hi] 换一下，再调用 partition。
 * 全相同的数需要三路分区才能躲开，这里只要不栈溢出即可。
 */
fun quickSort(arr: IntArray) {
    TODO("写快速排序")
}

/**
 * 快速选择：返回 arr 排好序以后的第 [k] 小的数（k 从 1 开始，k = 1 是最小的）。可以打乱 arr 的顺序。
 * k 不在 1..arr.size 里时抛出 IllegalArgumentException。
 *
 * 例子：arr = [6, 2, 8, 4, 1, 7, 3, 5]
 *   quickSelect(arr, 1) = 1，quickSelect(arr, 4) = 4，quickSelect(arr, 8) = 8
 *
 * 提示：分区以后标杆落在下标 p，它是第 p + 1 小的。如果 p + 1 正好等于 k，就找到了；
 * 否则第 k 小只可能在标杆的一边，只处理那一边，另一边整个扔掉。
 * 这样平均只要 O(n)：不用排序，每次只管有答案的那一半。
 */
fun quickSelect(arr: IntArray, k: Int): Int {
    TODO("写快速选择")
}
