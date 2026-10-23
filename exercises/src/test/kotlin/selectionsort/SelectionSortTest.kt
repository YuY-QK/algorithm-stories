package selectionsort

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class SelectionSortTest {
    private val rnd = Random(42)

    /** 排一份拷贝，返回结果，失败信息里带上原始输入 */
    private fun check(input: IntArray) {
        val arr = input.copyOf()
        selectionSort(arr)
        assertContentEquals(input.sortedArray(), arr, "输入 ${input.contentToString()}，期望 ${input.sortedArray().contentToString()}，实际 ${arr.contentToString()}")
    }

    @Test
    fun `空数组和只有一个元素`() {
        check(intArrayOf())
        check(intArrayOf(7))
    }

    @Test
    fun `故事里的糖果`() {
        check(intArrayOf(5, 2, 6, 1, 4, 3))
    }

    @Test
    fun `排好的不能再被换乱`() {
        // 内层循环从 0 开始的话，这一组会排成 [4, 3, 1, 2]
        check(intArrayOf(3, 4, 1, 2))
    }

    @Test
    fun `要和目前最小的比，不是和 arr i 比`() {
        // 每次都和 arr[i] 比的话，这一组会排成 [2, 1, 3, 4, 5]
        check(intArrayOf(4, 1, 3, 5, 2))
    }

    @Test
    fun `交换不能丢数`() {
        // 交换时没用临时变量的话，这一组会变成 [1, 1, 2]
        check(intArrayOf(3, 1, 2))
    }

    @Test
    fun `已经有序、完全倒序、全部相同`() {
        check(IntArray(20) { it })
        check(IntArray(20) { 20 - it })
        check(IntArray(10) { 5 })
    }

    @Test
    fun `随机数组，可能有重复和负数`() {
        repeat(1000) {
            check(IntArray(rnd.nextInt(0, 30)) { rnd.nextInt(-20, 20) })
        }
    }

    @Test
    fun `kthSmallest：题目里的例子`() {
        assertEquals(2, kthSmallest(intArrayOf(7, 2, 9, 2, 5), 1))
        assertEquals(2, kthSmallest(intArrayOf(7, 2, 9, 2, 5), 2))
        assertEquals(5, kthSmallest(intArrayOf(7, 2, 9, 2, 5), 3))
        assertEquals(9, kthSmallest(intArrayOf(7, 2, 9, 2, 5), 5))
    }

    @Test
    fun `kthSmallest：随机数组，每个 k 都对`() {
        repeat(500) {
            val input = IntArray(rnd.nextInt(1, 25)) { rnd.nextInt(0, 15) }
            val sorted = input.sortedArray()
            for (k in 1..input.size) {
                assertEquals(sorted[k - 1], kthSmallest(input.copyOf(), k), "arr = ${input.contentToString()}，k = $k")
            }
        }
    }
}
