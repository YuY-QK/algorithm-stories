package linearsearch

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class LinearSearchTest {
    private val rnd = Random(7)

    /** 随机数组：数不大，容易有重复，也有 0 和负数 */
    private fun randomArray(n: Int) = IntArray(n) { rnd.nextInt(-3, 8) }

    @Test
    fun `空数组返回 -1`() {
        assertEquals(-1, linearSearch(intArrayOf(), 3))
    }

    @Test
    fun `只有一个元素`() {
        assertEquals(0, linearSearch(intArrayOf(7), 7))
        assertEquals(-1, linearSearch(intArrayOf(7), 6))
    }

    @Test
    fun `目标在第一个、中间、最后一个`() {
        val arr = intArrayOf(4, 9, 2, 8, 5)
        assertEquals(0, linearSearch(arr, 4))
        assertEquals(2, linearSearch(arr, 2))
        assertEquals(4, linearSearch(arr, 5), "目标在最后一个，循环要走到最后一个下标")
    }

    @Test
    fun `目标不存在返回 -1，不能崩溃`() {
        val arr = intArrayOf(4, 9, 2, 8)
        assertEquals(-1, linearSearch(arr, 5), "arr = ${arr.contentToString()}，target = 5，别读到 arr[arr.size]")
    }

    @Test
    fun `有重复元素时返回第一个`() {
        assertEquals(0, linearSearch(intArrayOf(3, 7, 3), 3), "arr = [3, 7, 3]，target = 3，应该是第一个，找到就 return")
        assertEquals(1, linearSearch(intArrayOf(1, 5, 5, 5), 5))
    }

    @Test
    fun `目标是 0 或负数，不要拿 0 当「找不到」`() {
        assertEquals(0, linearSearch(intArrayOf(0, 1, 2), 0))
        assertEquals(-1, linearSearch(intArrayOf(5, 9, 2), 0), "arr = [5, 9, 2]，target = 0，没有 0，应该返回 -1")
        assertEquals(2, linearSearch(intArrayOf(5, 9, -2), -2))
        assertEquals(-1, linearSearch(intArrayOf(5, 9, 2), -1))
    }

    @Test
    fun `随机数组：和标准库 indexOf 比`() {
        repeat(2000) {
            val arr = randomArray(rnd.nextInt(0, 12))
            for (t in -4..9) assertEquals(arr.indexOf(t), linearSearch(arr, t), "arr = ${arr.contentToString()}，target = $t")
        }
    }

    // ---------- 哨兵版 ----------

    @Test
    fun `哨兵版：空数组和单元素`() {
        assertEquals(-1, linearSearchSentinel(intArrayOf(), 3))
        assertEquals(0, linearSearchSentinel(intArrayOf(7), 7))
        assertEquals(-1, linearSearchSentinel(intArrayOf(7), 6), "只有一个元素，哨兵放在它身上，要分清是真找到还是撞哨兵")
    }

    @Test
    fun `哨兵版：目标等于原来的末尾元素`() {
        val arr = intArrayOf(4, 9, 2, 8)
        assertEquals(3, linearSearchSentinel(arr, 8), "target 就是原来的最后一个，这是真找到，不是撞哨兵")
    }

    @Test
    fun `哨兵版：目标不存在，不能把撞哨兵当成找到`() {
        val arr = intArrayOf(4, 9, 2, 8)
        assertEquals(-1, linearSearchSentinel(arr, 5), "arr = ${arr.contentToString()}，target = 5")
    }

    @Test
    fun `哨兵版：有重复时仍然返回第一个`() {
        assertEquals(0, linearSearchSentinel(intArrayOf(3, 7, 3), 3))
    }

    @Test
    fun `哨兵版：调用以后数组内容不变`() {
        repeat(500) {
            val arr = randomArray(rnd.nextInt(0, 12))
            val copy = arr.copyOf()
            val t = rnd.nextInt(-4, 9)
            linearSearchSentinel(arr, t)
            assertContentEquals(copy, arr, "调用后数组被改了：原来 ${copy.contentToString()}，target = $t，别忘了把末尾元素放回去")
        }
    }

    @Test
    fun `哨兵版：随机数组，和 indexOf 比`() {
        repeat(2000) {
            val arr = randomArray(rnd.nextInt(0, 12))
            val copy = arr.copyOf()
            for (t in -4..9) assertEquals(copy.indexOf(t), linearSearchSentinel(arr, t), "arr = ${copy.contentToString()}，target = $t")
        }
    }
}
