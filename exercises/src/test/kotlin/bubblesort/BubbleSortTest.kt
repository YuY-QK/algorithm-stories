package bubblesort

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals

class BubbleSortTest {
    private val rnd = Random(42)

    @Test
    fun `故事里的队伍`() {
        val arr = intArrayOf(120, 145, 118, 132, 138)
        bubbleSort(arr)
        assertEquals(listOf(118, 120, 132, 138, 145), arr.toList())
    }

    @Test
    fun `空数组和一个元素不会出错`() {
        val empty = intArrayOf()
        bubbleSort(empty)
        assertEquals(emptyList(), empty.toList())
        val one = intArrayOf(7)
        bubbleSort(one)
        assertEquals(listOf(7), one.toList(), "只有一个元素时内层循环一次都不该走，j + 1 会越界吗？")
    }

    @Test
    fun `两个元素、逆序、有重复`() {
        for (input in listOf(listOf(2, 1), listOf(5, 4, 3, 2, 1), listOf(3, 1, 3, 1, 2), listOf(4, 4, 4))) {
            val arr = input.toIntArray()
            bubbleSort(arr)
            assertEquals(input.sorted(), arr.toList(), "输入 $input")
        }
    }

    @Test
    fun `随机数组都排对`() {
        repeat(1000) {
            val input = List(rnd.nextInt(0, 30)) { rnd.nextInt(-20, 20) }
            val arr = input.toIntArray()
            bubbleSort(arr)
            assertEquals(input.sorted(), arr.toList(), "输入 $input")
        }
    }

    /** 有几个逆序对：i < j 且 a[i] > a[j] */
    private fun inversions(a: List<Int>): Int =
        a.indices.sumOf { i -> (i + 1 until a.size).count { j -> a[i] > a[j] } }

    private data class Kid(val name: String, val score: Int)

    // 放在测试函数外面：编译器会为 compareBy、sortedBy 这类内联函数生成一个以所在函数命名的类，中文函数名在某些系统上会写不出文件
    private val byScore: Comparator<Kid> = compareBy { it.score }

    @Test
    fun `bubbleSortWith：题目里的例子`() {
        val list = mutableListOf(Kid("小兔", 90), Kid("小熊", 80), Kid("小猫", 90))
        val swaps = bubbleSortWith(list, byScore)
        assertEquals(listOf("小熊", "小兔", "小猫"), list.map { it.name }, "同分的小兔原来在小猫前面，排完也该在前面")
        assertEquals(1, swaps)
    }

    @Test
    fun `bubbleSortWith：随机数据排对、稳定、交换次数等于逆序对`() {
        repeat(1000) {
            val input = List(rnd.nextInt(0, 25)) { k -> Kid("#$k", rnd.nextInt(0, 6)) }
            val list = input.toMutableList()
            val swaps = bubbleSortWith(list, byScore)
            assertEquals(input.sortedWith(byScore), list, "输入 $input（同分的要保持原来的先后顺序）")
            assertEquals(inversions(input.map { it.score }), swaps, "输入 $input 的交换次数")
        }
    }

    @Test
    fun `bubbleSortWith：可以倒着排`() {
        val list = mutableListOf(3, 1, 2)
        bubbleSortWith(list, reverseOrder())
        assertEquals(listOf(3, 2, 1), list)
    }

    @Test
    fun `bubbleSortWith：已经排好时只比较 n - 1 次`() {
        var calls = 0
        val counting = Comparator<Int> { a, b -> calls++; a.compareTo(b) }
        val list = MutableList(1000) { it }
        val swaps = bubbleSortWith(list, counting)
        assertEquals(0, swaps)
        assertEquals(999, calls, "一轮没换就该提前结束，swapped 在每一轮开头重置了吗？")
    }

    @Test
    fun `bubbleSortWith：完全逆序是最坏情况`() {
        var calls = 0
        val counting = Comparator<Int> { a, b -> calls++; a.compareTo(b) }
        val n = 50
        val list = MutableList(n) { n - it }
        val swaps = bubbleSortWith(list, counting)
        assertEquals((1..n).toList(), list)
        assertEquals(n * (n - 1) / 2, swaps)
        assertEquals(n * (n - 1) / 2, calls, "第 i 轮只需比到 n - 1 - i，后面的已经站好了")
    }
}
