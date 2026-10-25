package mergesort

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class MergeSortTest {
    private val rnd = Random(42)

    private fun bruteInversions(a: IntArray): Long {
        var c = 0L
        for (x in a.indices) for (y in x + 1 until a.size) if (a[x] > a[y]) c++
        return c
    }

    @Test
    fun `merge：题目里的例子`() {
        assertContentEquals(intArrayOf(1, 2, 3, 4, 5, 6), merge(intArrayOf(2, 5, 6), intArrayOf(1, 3, 4)), "a = [2, 5, 6]，b = [1, 3, 4]")
    }

    @Test
    fun `merge：一边是空的，或者一边全比另一边小`() {
        assertContentEquals(intArrayOf(1, 2), merge(intArrayOf(1, 2), intArrayOf()), "a = [1, 2]，b = []")
        assertContentEquals(intArrayOf(1, 2), merge(intArrayOf(), intArrayOf(1, 2)), "a = []，b = [1, 2]")
        assertContentEquals(intArrayOf(), merge(intArrayOf(), intArrayOf()))
        assertContentEquals(intArrayOf(1, 2, 3, 4), merge(intArrayOf(1, 2), intArrayOf(3, 4)), "左边全比右边小，右边要接在后面")
        assertContentEquals(intArrayOf(1, 2, 3, 4), merge(intArrayOf(3, 4), intArrayOf(1, 2)), "右边全比左边小，左边要接在后面")
    }

    @Test
    fun `merge：有重复的数，不改动输入`() {
        val a = intArrayOf(1, 3, 3, 5)
        val b = intArrayOf(3, 3, 4)
        assertContentEquals(intArrayOf(1, 3, 3, 3, 3, 4, 5), merge(a, b))
        assertContentEquals(intArrayOf(1, 3, 3, 5), a, "merge 不应该改动 a")
        assertContentEquals(intArrayOf(3, 3, 4), b, "merge 不应该改动 b")
    }

    @Test
    fun `merge：随机的两个有序数组`() {
        repeat(2000) {
            val a = IntArray(rnd.nextInt(0, 12)) { rnd.nextInt(-5, 5) }.also { it.sort() }
            val b = IntArray(rnd.nextInt(0, 12)) { rnd.nextInt(-5, 5) }.also { it.sort() }
            assertContentEquals((a + b).sortedArray(), merge(a, b), "a = ${a.contentToString()}，b = ${b.contentToString()}")
        }
    }

    @Test
    fun `mergeSort：题目里的例子`() {
        assertContentEquals(intArrayOf(1, 2, 3, 4, 5, 6), mergeSort(intArrayOf(5, 2, 6, 1, 4, 3)), "输入 [5, 2, 6, 1, 4, 3]")
    }

    @Test
    fun `mergeSort：空数组和只有一个元素`() {
        assertContentEquals(intArrayOf(), mergeSort(intArrayOf()))
        assertContentEquals(intArrayOf(7), mergeSort(intArrayOf(7)))
    }

    @Test
    fun `mergeSort：长度是奇数、已经有序、倒序、全相同`() {
        assertContentEquals(intArrayOf(1, 2, 3), mergeSort(intArrayOf(3, 1, 2)), "输入 [3, 1, 2]：长度 3 怎么分？")
        assertContentEquals(intArrayOf(1, 2, 3, 4, 5), mergeSort(intArrayOf(1, 2, 3, 4, 5)))
        assertContentEquals(intArrayOf(1, 2, 3, 4, 5), mergeSort(intArrayOf(5, 4, 3, 2, 1)))
        assertContentEquals(intArrayOf(2, 2, 2, 2), mergeSort(intArrayOf(2, 2, 2, 2)))
    }

    @Test
    fun `mergeSort：不改动输入，随机数组和标准库结果一样`() {
        repeat(2000) {
            val input = IntArray(rnd.nextInt(0, 40)) { rnd.nextInt(-10, 10) }
            val copy = input.copyOf()
            assertContentEquals(input.sortedArray(), mergeSort(input), "输入 ${input.contentToString()}")
            assertContentEquals(copy, input, "mergeSort 不应该改动输入数组")
        }
    }

    @Test
    fun `mergeSort：十万个数也要很快`() {
        val input = IntArray(100_000) { rnd.nextInt() }
        assertContentEquals(input.sortedArray(), mergeSort(input))
    }

    @Test
    fun `countInversions：题目里的例子`() {
        assertEquals(6L, countInversions(intArrayOf(4, 2, 5, 1, 3)), "输入 [4, 2, 5, 1, 3]")
    }

    @Test
    fun `countInversions：有序是 0，倒序是 n(n-1)÷2，相等的不算`() {
        assertEquals(0L, countInversions(intArrayOf()))
        assertEquals(0L, countInversions(intArrayOf(9)))
        assertEquals(0L, countInversions(intArrayOf(1, 2, 3, 4)))
        assertEquals(0L, countInversions(intArrayOf(2, 2, 2)), "相等的不是逆序对：比较要用 <= 不是 <")
        for (n in 1..40) assertEquals(n * (n - 1) / 2L, countInversions(IntArray(n) { n - it }), "倒序数组，n = $n")
    }

    @Test
    fun `countInversions：随机数组和暴力结果一样，不改动输入`() {
        repeat(2000) {
            val input = IntArray(rnd.nextInt(0, 30)) { rnd.nextInt(-8, 8) }
            val copy = input.copyOf()
            assertEquals(bruteInversions(input), countInversions(input), "输入 ${input.contentToString()}")
            assertContentEquals(copy, input, "countInversions 不应该改动输入数组")
        }
    }

    @Test
    fun `countInversions：五万个数，暴力要跑十几亿次`() {
        val input = IntArray(50_000) { 50_000 - it }
        assertEquals(50_000L * 49_999 / 2, countInversions(input), "倒序的 5 万个数，逆序对超过 Int 的范围了吗？")
    }
}
