package insertionsort

// 参考答案。自己写完、测试通过以后再来对照。

fun insertionSort(arr: IntArray): Int {
    var moves = 0
    for (i in 1 until arr.size) {
        val key = arr[i] // 先存起来，挪第一次时 arr[i] 就会被盖掉
        var j = i - 1
        while (j >= 0 && arr[j] > key) { // 只挪严格更大的，相等的不挪，保持稳定
            arr[j + 1] = arr[j]
            j--
            moves++
        }
        arr[j + 1] = key // 循环停下时，空位在 j + 1
    }
    return moves
}

fun <T> binaryInsertionSort(list: MutableList<T>, comparator: Comparator<in T>) {
    for (i in 1 until list.size) {
        val key = list[i]
        // 在 [0, i) 里找第一个比 key 大的位置（upper bound），左闭右开 [lo, hi)
        var lo = 0
        var hi = i
        while (lo < hi) {
            val mid = lo + (hi - lo) / 2
            if (comparator.compare(list[mid], key) <= 0) lo = mid + 1 // 相等也往右走，key 排在相等元素后面
            else hi = mid
        }
        for (j in i downTo lo + 1) list[j] = list[j - 1]
        list[lo] = key
    }
}
