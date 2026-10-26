package linearsearch

// 参考答案。自己写完、测试通过以后再来对照。

fun linearSearch(arr: IntArray, target: Int): Int {
    for (i in arr.indices) {
        if (arr[i] == target) return i
    }
    return -1
}

fun linearSearchSentinel(arr: IntArray, target: Int): Int {
    if (arr.isEmpty()) return -1
    val last = arr[arr.size - 1]
    arr[arr.size - 1] = target // 哨兵：保证循环一定会停
    var i = 0
    while (arr[i] != target) i++
    arr[arr.size - 1] = last // 还原
    // 停在最后一个位置：要么原来末尾就是目标，要么只是撞上了哨兵
    return if (i < arr.size - 1 || last == target) i else -1
}
