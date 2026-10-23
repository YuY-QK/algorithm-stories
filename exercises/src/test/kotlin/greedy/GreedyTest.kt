package greedy

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GreedyTest {
    private val rnd = Random(42)

    /** 一套随机面值，互不相同，withOne 时一定有 1 */
    private fun randomCoins(withOne: Boolean): IntArray {
        val set = mutableSetOf<Int>()
        if (withOne) set.add(1)
        val k = rnd.nextInt(1, 6)
        while (set.size < k + (if (withOne) 1 else 0)) set.add(rnd.nextInt(2, 40))
        return set.shuffled(rnd).toIntArray()
    }

    /** 宽度优先搜索：一枚一枚加，最先凑到 amount 的层数就是最少枚数。只用来核对 */
    private fun bruteMin(coins: IntArray, amount: Int): Int {
        if (amount == 0) return 0
        var frontier = listOf(0)
        val seen = mutableSetOf(0)
        var depth = 0
        while (frontier.isNotEmpty()) {
            depth++
            val next = mutableListOf<Int>()
            for (s in frontier) for (c in coins) {
                val t = s + c
                if (t == amount) return depth
                if (t < amount && seen.add(t)) next.add(t)
            }
            frontier = next
        }
        return -1
    }

    @Test
    fun `贪心：题目里的例子`() {
        assertEquals(listOf(20, 20, 5, 1), greedyChange(intArrayOf(1, 2, 5, 10, 20, 50), 46))
        assertEquals(listOf(4, 1, 1), greedyChange(intArrayOf(1, 3, 4), 6))
        assertEquals(emptyList(), greedyChange(intArrayOf(1, 5), 0), "amount = 0 时什么都不用拿")
    }

    @Test
    fun `贪心：面值给的顺序是乱的`() {
        assertEquals(listOf(10, 2), greedyChange(intArrayOf(1, 2, 5, 10), 12), "coins = [1, 2, 5, 10]，amount = 12。先拿大的：排序方向对吗？")
        assertEquals(listOf(25, 10, 5, 1), greedyChange(intArrayOf(10, 1, 25, 5), 41), "coins = [10, 1, 25, 5]，amount = 41")
    }

    @Test
    fun `贪心：同一种面值要拿好几枚`() {
        assertEquals(listOf(10, 10, 5, 2), greedyChange(intArrayOf(1, 2, 5, 10), 27), "coins = [1, 2, 5, 10]，amount = 27。用的是 while 还是 if？")
        assertEquals(List(7) { 1 }, greedyChange(intArrayOf(1), 7))
    }

    @Test
    fun `贪心：随机面值，从大到小、加起来正好、每一枚都是当时能拿的最大的`() {
        repeat(1000) {
            val coins = randomCoins(withOne = true)
            val amount = rnd.nextInt(0, 200)
            val got = greedyChange(coins, amount)
            val msg = "coins = ${coins.contentToString()}，amount = $amount，返回 $got"
            assertEquals(amount, got.sum(), msg)
            var left = amount
            for (c in got) {
                assertEquals(coins.filter { it <= left }.max(), c, msg)
                left -= c
            }
        }
    }

    @Test
    fun `动态规划：题目里的例子`() {
        assertEquals(2, minCoins(intArrayOf(1, 3, 4), 6))
        assertEquals(-1, minCoins(intArrayOf(2), 3))
        assertEquals(0, minCoins(intArrayOf(5, 7), 0))
        assertEquals(4, minCoins(intArrayOf(1, 2, 5, 10, 20, 50), 46))
        assertEquals(2, minCoins(intArrayOf(1, 3, 6, 12, 24, 30), 48), "24 + 24，贪心要 30 + 12 + 6")
    }

    @Test
    fun `动态规划：随机面值，和穷举一致（包括凑不出来）`() {
        repeat(300) {
            val coins = randomCoins(withOne = rnd.nextBoolean())
            for (amount in 0..80) {
                assertEquals(bruteMin(coins, amount), minCoins(coins, amount), "coins = ${coins.contentToString()}，amount = $amount")
            }
        }
    }

    @Test
    fun `对比：贪心从来不会比最少的还少，1、5、10、25 下两者一样`() {
        val usd = intArrayOf(1, 5, 10, 25)
        for (amount in 0..300) {
            assertEquals(minCoins(usd, amount), greedyChange(usd, amount).size, "coins = [1, 5, 10, 25]，amount = $amount")
        }
        repeat(200) {
            val coins = randomCoins(withOne = true)
            val amount = rnd.nextInt(0, 150)
            assertTrue(greedyChange(coins, amount).size >= minCoins(coins, amount), "coins = ${coins.contentToString()}，amount = $amount")
        }
    }
}
