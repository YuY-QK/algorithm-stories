package binarysearch

// 参考答案。自己写完、测试通过以后再来对照。

fun binarySearch(arr: IntArray, target: Int): Int {
    var lo = 0
    var hi = arr.size - 1
    while (lo <= hi) {
        val mid = lo + (hi - lo) / 2
        when {
            arr[mid] == target -> return mid
            arr[mid] < target -> lo = mid + 1
            else -> hi = mid - 1
        }
    }
    return -1
}

fun lowerBound(arr: IntArray, target: Int): Int {
    var lo = 0
    var hi = arr.size // 左闭右开 [lo, hi)
    while (lo < hi) {
        val mid = lo + (hi - lo) / 2
        if (arr[mid] < target) lo = mid + 1 // mid 太小，答案在右边
        else hi = mid // mid 可能就是答案，留在范围里
    }
    return lo
}
