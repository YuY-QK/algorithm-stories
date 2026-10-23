package quicksort

import kotlin.random.Random

// 参考答案。自己写完、测试通过以后再来对照。

private fun swap(arr: IntArray, a: Int, b: Int) {
    val t = arr[a]
    arr[a] = arr[b]
    arr[b] = t
}

fun partition(arr: IntArray, lo: Int, hi: Int): Int {
    val pivot = arr[hi]
    var i = lo - 1 // i 是「比标杆小的那一队」的最右边，一开始队里没人
    for (j in lo until hi) {
        if (arr[j] < pivot) { // 严格小于：相等的留在右边
            i++
            swap(arr, i, j)
        }
    }
    swap(arr, i + 1, hi) // 小队后面的第一个位置，就是标杆的家
    return i + 1
}

/** 随机挑一个当标杆：先换到最右边，再用 partition。已经排好的数组也不会退化 */
private fun randomPartition(arr: IntArray, lo: Int, hi: Int): Int {
    swap(arr, Random.nextInt(lo, hi + 1), hi)
    return partition(arr, lo, hi)
}

fun quickSort(arr: IntArray) {
    sort(arr, 0, arr.size - 1)
}

private fun sort(arr: IntArray, lo0: Int, hi0: Int) {
    var lo = lo0
    var hi = hi0
    while (lo < hi) {
        val p = randomPartition(arr, lo, hi)
        // 先递归短的一边，长的一边用循环接着做：递归深度不会超过 log2(n)
        if (p - lo < hi - p) {
            sort(arr, lo, p - 1)
            lo = p + 1
        } else {
            sort(arr, p + 1, hi)
            hi = p - 1
        }
    }
}

fun quickSelect(arr: IntArray, k: Int): Int {
    require(k in 1..arr.size) { "k = $k 不在 1..${arr.size} 里" }
    var lo = 0
    var hi = arr.size - 1
    while (true) {
        val p = randomPartition(arr, lo, hi)
        when {
            p == k - 1 -> return arr[p] // 标杆正好是第 k 小
            p > k - 1 -> hi = p - 1 // 第 k 小在标杆左边，右边整个扔掉
            else -> lo = p + 1 // 在右边，左边整个扔掉
        }
    }
}
