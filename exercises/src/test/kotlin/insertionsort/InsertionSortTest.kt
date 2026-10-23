package insertionsort

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class InsertionSortTest {
    private val rnd = Random(42)

    /** 逆序对数：前面比后面大的一对算一个。插入排序挪动的次数正好等于它 */
    private fun inversions(a: IntArray): Int {
        var c = 0
        for (x in a.indices) for (y in x + 1 until a.size) if (a[x] > a[y]) c++
        return c
    }

    @Test
    fun `题目里的例子`() {
        val arr = intArrayOf(4, 2, 5, 1, 3)
        val moves = insertionSort(arr)
        assertContentEquals(intArrayOf(1, 2, 3, 4, 5), arr, "输入 [4, 2, 5, 1, 3]")
        assertEquals(6, moves, "输入 [4, 2, 5, 1, 3]，应该挪 6 次")
    }

    @Test
    fun `空数组和只有一个元素`() {
        val empty = intArrayOf()
        assertEquals(0, insertionSort(empty))
        val one = intArrayOf(7)
        assertEquals(0, insertionSort(one))
        assertContentEquals(intArrayOf(7), one)
    }

    @Test
    fun `最小的元素要能挪到下标 0`() {
        val arr = intArrayOf(3, 1)
        insertionSort(arr)
        assertContentEquals(intArrayOf(1, 3), arr, "输入 [3, 1]：循环条件是 j >= 0 吗？")
    }

    @Test
    fun `已经有序一次都不挪，倒序挪 n(n-1)÷2 次`() {
        for (n in 1..30) {
            val up = IntArray(n) { it }
            assertEquals(0, insertionSort(up.copyOf()), "有序数组 ${up.contentToString()} 不用挪")
            val down = IntArray(n) { n - it }
            assertEquals(n * (n - 1) / 2, insertionSort(down), "倒序数组，n = $n")
        }
    }

    @Test
    fun `相等的元素不挪`() {
        val arr = intArrayOf(2, 2, 2, 1)
        assertEquals(3, insertionSort(arr), "输入 [2, 2, 2, 1]：只有 1 要越过三个 2，比较写成 >= 了吗？")
        assertContentEquals(intArrayOf(1, 2, 2, 2), arr)
    }

    @Test
    fun `随机数组：排对了，挪动次数等于逆序对数`() {
        repeat(2000) {
            val input = IntArray(rnd.nextInt(0, 30)) { rnd.nextInt(-10, 10) }
            val arr = input.copyOf()
            val moves = insertionSort(arr)
            assertContentEquals(input.sortedArray(), arr, "输入 ${input.contentToString()}")
            assertEquals(inversions(input), moves, "输入 ${input.contentToString()} 的挪动次数")
        }
    }

    /** 一张牌：点数 rank，花色 suit。只按点数比较，花色用来看稳定性 */
    data class Card(val rank: Int, val suit: Char) {
        override fun toString() = "$rank$suit"
    }

    private val byRank = compareBy<Card> { it.rank }

    @Test
    fun `二分插入排序：题目里的例子，两张 3 不换位置`() {
        val hand = mutableListOf(Card(3, '♥'), Card(1, '♠'), Card(3, '♣'), Card(2, '♦'))
        binaryInsertionSort(hand, byRank)
        assertEquals(listOf(Card(1, '♠'), Card(2, '♦'), Card(3, '♥'), Card(3, '♣')), hand, "3♥ 本来在 3♣ 前面，找插入位置时相等要往右走")
    }

    @Test
    fun `二分插入排序：空列表和整数`() {
        val empty = mutableListOf<Int>()
        binaryInsertionSort(empty, naturalOrder())
        assertEquals(emptyList(), empty)
        val nums = mutableListOf(5, 3, 9, 1, 3)
        binaryInsertionSort(nums, naturalOrder())
        assertEquals(listOf(1, 3, 3, 5, 9), nums)
    }

    @Test
    fun `二分插入排序：随机牌堆，和标准库的稳定排序结果一样`() {
        val suits = "♥♠♣♦"
        repeat(2000) {
            val input = List(rnd.nextInt(0, 25)) { Card(rnd.nextInt(1, 6), suits[rnd.nextInt(4)]) }
            val hand = input.toMutableList()
            binaryInsertionSort(hand, byRank)
            // Kotlin 的 sortedWith 是稳定排序
            assertEquals(input.sortedWith(byRank), hand, "输入 $input")
        }
    }
}
