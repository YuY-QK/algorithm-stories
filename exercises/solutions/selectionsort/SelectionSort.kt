package selectionsort

// 参考答案。自己写完、测试通过以后再来对照。

fun selectionSort(arr: IntArray) {
    val n = arr.size
    for (i in 0 until n - 1) { // 最后一个不用挑
        var minIdx = i // 每一轮都要重新从 i 开始
        for (j in i + 1 until n) { // 只看还没排好的部分
            if (arr[j] < arr[minIdx]) { // 和「目前最小的」比
                minIdx = j
            }
        }
        if (minIdx != i) {
            val tmp = arr[i]
            arr[i] = arr[minIdx]
            arr[minIdx] = tmp
        }
    }
}

fun kthSmallest(arr: IntArray, k: Int): Int {
    require(k in 1..arr.size) { "k 要在 1 到 ${arr.size} 之间" }
    for (i in 0 until k) { // 只做 k 轮
        var minIdx = i
        for (j in i + 1 until arr.size) {
            if (arr[j] < arr[minIdx]) minIdx = j
        }
        val tmp = arr[i]
        arr[i] = arr[minIdx]
        arr[minIdx] = tmp
    }
    return arr[k - 1]
}
