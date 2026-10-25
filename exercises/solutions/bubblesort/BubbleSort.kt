package bubblesort

// 参考答案。自己写完、测试通过以后再来对照。

fun bubbleSort(arr: IntArray) {
    val n = arr.size
    for (i in 0 until n - 1) {
        var swapped = false
        for (j in 0 until n - 1 - i) { // 最后 i 个已经站好；j + 1 最大到 n - 1 - i
            if (arr[j] > arr[j + 1]) { // 用 > 不用 >=：相等不换，排序才稳定
                val t = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = t
                swapped = true
            }
        }
        if (!swapped) break // 一整轮没换，已经有序
    }
}

fun <T> bubbleSortWith(list: MutableList<T>, comparator: Comparator<in T>): Int {
    val n = list.size
    var swaps = 0
    for (i in 0 until n - 1) {
        var swapped = false
        for (j in 0 until n - 1 - i) {
            if (comparator.compare(list[j], list[j + 1]) > 0) {
                val t = list[j]
                list[j] = list[j + 1]
                list[j + 1] = t
                swaps++
                swapped = true
            }
        }
        if (!swapped) break
    }
    return swaps
}
