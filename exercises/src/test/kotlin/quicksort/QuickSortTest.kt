package quicksort

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class QuickSortTest {
    private val rnd = Random(42)

    private fun randomArray(n: Int, bound: Int) = IntArray(n) { rnd.nextInt(bound) }

    @Test
    fun `partition 题目里的例子`() {
        val arr = intArrayOf(6, 2, 8, 4, 1, 7, 3, 5)
        val p = partition(arr, 0, 7)
        assertEquals(4, p, "输入 [6, 2, 8, 4, 1, 7, 3, 5]，标杆 5 比它小的有 4 个，应该落在下标 4")
        assertEquals(5, arr[4], "标杆 5 应该站在下标 4，现在数组是 ${arr.toList()}")
        assertEquals(listOf(1, 2, 3, 4), arr.sliceArray(0 until 4).sorted(), "左边四个都要比 5 小，现在数组是 ${arr.toList()}")
        assertEquals(listOf(6, 7, 8), arr.sliceArray(5 until 8).sorted(), "右边三个都要比 5 大，现在数组是 ${arr.toList()}")
    }

    @Test
    fun `partition 在区间里分区而且不碰区间外面的元素`() {
        repeat(500) {
            val n = 1 + rnd.nextInt(12)
            val a = randomArray(n, 8)
            val lo = rnd.nextInt(n)
            val hi = lo + rnd.nextInt(n - lo)
            val b = a.copyOf()
            val pivot = a[hi]
            val p = partition(b, lo, hi)
            val msg = "输入 ${a.toList()}，partition(arr, $lo, $hi)，标杆 $pivot，结果 ${b.toList()}，返回 $p"
            assertTrue(p in lo..hi, "返回值要在 $lo..$hi 里。$msg")
            assertEquals(pivot, b[p], "arr[p] 应该是标杆。$msg")
            for (x in lo until p) assertTrue(b[x] < pivot, "下标 $x 在标杆左边，要比标杆小。$msg")
            for (x in p + 1..hi) assertTrue(b[x] >= pivot, "下标 $x 在标杆右边，不能比标杆小。$msg")
            for (x in a.indices) if (x < lo || x > hi) assertEquals(a[x], b[x], "区间外的下标 $x 被改动了。$msg")
            assertContentEquals(a.sortedArray(), b.sortedArray(), "分区只能挪动元素，不能丢或多。$msg")
        }
    }

    @Test
    fun `partition 只有一个元素`() {
        val arr = intArrayOf(9, 4, 7)
        assertEquals(1, partition(arr, 1, 1), "区间里只有 arr[1]，它自己就是标杆")
        assertContentEquals(intArrayOf(9, 4, 7), arr)
    }

    @Test
    fun `partition 标杆是最大的和最小的`() {
        val big = intArrayOf(3, 1, 2, 9)
        assertEquals(3, partition(big, 0, 3), "输入 [3, 1, 2, 9]：标杆最大，应该留在最右边")
        val small = intArrayOf(3, 5, 2, 1)
        assertEquals(0, partition(small, 0, 3), "输入 [3, 5, 2, 1]：标杆最小，应该换到最左边")
        assertEquals(1, small[0])
    }

    @Test
    fun `quickSort 题目里的例子`() {
        val arr = intArrayOf(6, 2, 8, 4, 1, 7, 3, 5)
        quickSort(arr)
        assertContentEquals(intArrayOf(1, 2, 3, 4, 5, 6, 7, 8), arr, "输入 [6, 2, 8, 4, 1, 7, 3, 5]")
    }

    @Test
    fun `quickSort 空数组和只有一个元素`() {
        val empty = intArrayOf()
        quickSort(empty)
        assertEquals(0, empty.size)
        val one = intArrayOf(7)
        quickSort(one)
        assertContentEquals(intArrayOf(7), one)
    }

    @Test
    fun `quickSort 两个元素`() {
        val arr = intArrayOf(2, 1)
        quickSort(arr)
        assertContentEquals(intArrayOf(1, 2), arr, "输入 [2, 1]")
        val same = intArrayOf(5, 5)
        quickSort(same)
        assertContentEquals(intArrayOf(5, 5), same, "输入 [5, 5]")
    }

    @Test
    fun `quickSort 随机数组和用标准库排序的结果一样`() {
        repeat(500) {
            val a = randomArray(rnd.nextInt(40), if (it % 2 == 0) 5 else 100)
            val b = a.copyOf()
            quickSort(b)
            assertContentEquals(a.sortedArray(), b, "输入 ${a.toList()}")
        }
    }

    @Test
    fun `quickSort 有负数`() {
        val arr = intArrayOf(3, -1, 0, -7, 5, -1)
        quickSort(arr)
        assertContentEquals(intArrayOf(-7, -1, -1, 0, 3, 5), arr)
    }

    @Test
    fun `quickSort 已经排好和完全倒序的大数组不能太慢也不能栈溢出`() {
        // 每次都拿最后一个当标杆，这两种输入要比较 n(n - 1)/2 次，递归深度 n。
        val n = 3000
        val sorted = IntArray(n) { it }
        quickSort(sorted)
        assertContentEquals(IntArray(n) { it }, sorted, "已经排好的 $n 个数")
        val reversed = IntArray(n) { n - it }
        quickSort(reversed)
        assertContentEquals(IntArray(n) { it + 1 }, reversed, "完全倒序的 $n 个数")
    }

    @Test
    fun `quickSort 全是相同的数`() {
        val arr = IntArray(3000) { 7 }
        quickSort(arr)
        assertTrue(arr.all { it == 7 })
        assertEquals(3000, arr.size)
    }

    @Test
    fun `quickSelect 题目里的例子`() {
        val data = intArrayOf(6, 2, 8, 4, 1, 7, 3, 5)
        assertEquals(1, quickSelect(data.copyOf(), 1), "第 1 小")
        assertEquals(4, quickSelect(data.copyOf(), 4), "第 4 小")
        assertEquals(8, quickSelect(data.copyOf(), 8), "第 8 小")
    }

    @Test
    fun `quickSelect 只有一个元素`() {
        assertEquals(42, quickSelect(intArrayOf(42), 1))
    }

    @Test
    fun `quickSelect 有重复的数`() {
        val data = intArrayOf(5, 1, 5, 2, 5, 2)
        // 排好是 [1, 2, 2, 5, 5, 5]
        for (k in 1..6) assertEquals(data.sortedArray()[k - 1], quickSelect(data.copyOf(), k), "输入 ${data.toList()}，第 $k 小")
    }

    @Test
    fun `quickSelect 随机数组每个 k 都和排序后的结果一样`() {
        repeat(300) {
            val a = randomArray(1 + rnd.nextInt(30), 12)
            val sorted = a.sortedArray()
            val k = 1 + rnd.nextInt(a.size)
            assertEquals(sorted[k - 1], quickSelect(a.copyOf(), k), "输入 ${a.toList()}，第 $k 小，应该是 ${sorted[k - 1]}")
        }
    }

    @Test
    fun `quickSelect k 不合法`() {
        assertFailsWith<IllegalArgumentException>("k = 0 不合法，第几小从 1 开始") { quickSelect(intArrayOf(1, 2, 3), 0) }
        assertFailsWith<IllegalArgumentException>("k = 4 超过了数组长度") { quickSelect(intArrayOf(1, 2, 3), 4) }
        assertFailsWith<IllegalArgumentException>("空数组没有第 1 小") { quickSelect(intArrayOf(), 1) }
    }

    @Test
    fun `quickSelect 大数组也要快`() {
        // 100 万个数里找中位数：只处理有答案的那一边，平均 O(n)，一般不到一秒。
        val a = IntArray(1_000_000) { rnd.nextInt() }
        val expected = a.sortedArray()[499_999]
        assertEquals(expected, quickSelect(a, 500_000), "100 万个随机数的中位数（第 500000 小）")
    }
}
