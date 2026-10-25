package insertionsort

/*
 * 关卡：插入排序「小熊理纸牌」
 *
 * 把下面两个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'insertionsort.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 */

/**
 * 把 [arr] 原地排成升序，返回一共挪了几次（`arr[j + 1] = arr[j]` 执行的次数）。
 *
 * 例子：arr = [4, 2, 5, 1, 3]
 *   排完 arr = [1, 2, 3, 4, 5]，返回 6
 *
 * 提示：先把 arr[i] 存进 key，再从 i - 1 往左比；比 key 大的往右挪一格。
 * 想一想：循环停下时，空位在哪个下标？
 */
fun insertionSort(arr: IntArray): Int {
    TODO("写你的插入排序")
}

/**
 * 变种：二分插入排序。用二分查找在已经排好的 list[0, i) 里找 key 该插的位置，再把这一段整体往右挪。
 * 必须是**稳定**的：[comparator] 认为相等的两个元素，排完后保持原来的先后顺序。
 *
 * 例子：按点数排扑克牌 [3♥, 1♠, 3♣, 2♦]
 *   排完是 [1♠, 2♦, 3♥, 3♣]：3♥ 本来在 3♣ 前面，排完也还在前面
 *
 * 提示：key 要插在「第一个比 key 大的元素」前面，而不是「第一个大于等于 key 的元素」前面。
 * 比较次数降到了 O(n log n)，但挪动次数没变，总时间还是 O(n²)。
 */
fun <T> binaryInsertionSort(list: MutableList<T>, comparator: Comparator<in T>) {
    TODO("写二分插入排序")
}
