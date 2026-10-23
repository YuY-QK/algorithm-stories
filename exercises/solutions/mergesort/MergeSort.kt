package mergesort

// 参考答案。自己写完、测试通过以后再来对照。

fun merge(a: IntArray, b: IntArray): IntArray {
    val out = IntArray(a.size + b.size)
    var i = 0
    var j = 0
    var k = 0
    while (i < a.size && j < b.size) {
        // <= ：相等时取 a 的，保持稳定
        if (a[i] <= b[j]) out[k++] = a[i++] else out[k++] = b[j++]
    }
    // 一边用完了，另一边剩下的直接接上
    while (i < a.size) out[k++] = a[i++]
    while (j < b.size) out[k++] = b[j++]
    return out
}

fun mergeSort(arr: IntArray): IntArray {
    if (arr.size <= 1) return arr.copyOf()
    val mid = arr.size / 2
    return merge(mergeSort(arr.copyOfRange(0, mid)), mergeSort(arr.copyOfRange(mid, arr.size)))
}

fun countInversions(arr: IntArray): Long {
    val a = arr.copyOf() // 不改动输入
    return sortAndCount(a, 0, a.size, IntArray(a.size))
}

/** 把 a[lo, hi) 排好，返回这一段里的逆序对数 */
private fun sortAndCount(a: IntArray, lo: Int, hi: Int, tmp: IntArray): Long {
    if (hi - lo <= 1) return 0
    val mid = (lo + hi) / 2
    var count = sortAndCount(a, lo, mid, tmp) + sortAndCount(a, mid, hi, tmp)
    var i = lo
    var j = mid
    var k = lo
    while (i < mid && j < hi) {
        if (a[i] <= a[j]) {
            tmp[k++] = a[i++]
        } else {
            count += mid - i // a[j] 比左边剩下的每一个都小
            tmp[k++] = a[j++]
        }
    }
    while (i < mid) tmp[k++] = a[i++]
    while (j < hi) tmp[k++] = a[j++]
    tmp.copyInto(a, lo, lo, hi)
    return count
}
