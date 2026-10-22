package binarysearch

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals

class BinarySearchTest {
    private val rnd = Random(42)

    /** 长度为 n 的严格递增随机数组 */
    private fun sortedDistinct(n: Int): IntArray {
        var v = rnd.nextInt(-50, 50)
        return IntArray(n) { v.also { v += rnd.nextInt(1, 10) } }
    }

    @Test
    fun `空数组返回 -1`() {
        assertEquals(-1, binarySearch(intArrayOf(), 3))
    }

    @Test
    fun `只有一个元素`() {
        assertEquals(0, binarySearch(intArrayOf(7), 7))
        assertEquals(-1, binarySearch(intArrayOf(7), 6))
        assertEquals(-1, binarySearch(intArrayOf(7), 8))
    }

    @Test
    fun `第一个和最后一个元素都能找到`() {
        val arr = intArrayOf(2, 5, 8)
        assertEquals(0, binarySearch(arr, 2))
        assertEquals(2, binarySearch(arr, 8), "lo 和 hi 相等时也要检查，循环条件是 <= 吗？")
    }

    @Test
    fun `不在数组里的值返回 -1，而且不会卡住`() {
        val arr = intArrayOf(1, 3, 5, 7)
        for (t in listOf(0, 2, 4, 6, 8)) assertEquals(-1, binarySearch(arr, t), "target = $t")
    }

    @Test
    fun `随机数组：每个元素都能找到`() {
        repeat(500) {
            val arr = sortedDistinct(rnd.nextInt(1, 40))
            for (i in arr.indices) assertEquals(i, binarySearch(arr, arr[i]), "arr = ${arr.contentToString()}，target = ${arr[i]}")
        }
    }

    @Test
    fun `随机数组：不存在的值都返回 -1`() {
        repeat(500) {
            val arr = sortedDistinct(rnd.nextInt(0, 40))
            val present = arr.toSet()
            for (t in -60..450) if (t !in present) assertEquals(-1, binarySearch(arr, t), "arr = ${arr.contentToString()}，target = $t")
        }
    }

    /** 逐个比较的笨办法，用来核对 lowerBound */
    private fun slowLowerBound(arr: IntArray, target: Int): Int = arr.indexOfFirst { it >= target }.let { if (it < 0) arr.size else it }

    @Test
    fun `lowerBound：题目里的例子`() {
        val arr = intArrayOf(1, 3, 3, 5)
        assertEquals(0, lowerBound(arr, 0))
        assertEquals(1, lowerBound(arr, 3))
        assertEquals(3, lowerBound(arr, 4))
        assertEquals(4, lowerBound(arr, 9))
        assertEquals(0, lowerBound(intArrayOf(), 1))
    }

    @Test
    fun `lowerBound：随机数组，可能有重复`() {
        repeat(1000) {
            val arr = IntArray(rnd.nextInt(0, 30)) { rnd.nextInt(0, 20) }.sorted().toIntArray()
            for (t in -1..21) assertEquals(slowLowerBound(arr, t), lowerBound(arr, t), "arr = ${arr.contentToString()}，target = $t")
        }
    }
}
