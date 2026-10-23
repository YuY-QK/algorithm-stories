package dp

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals

class DynamicProgrammingTest {
    private val rnd = Random(7)

    /** 不用便签的递归，只用来核对 */
    private fun bruteCost(cost: IntArray, i: Int): Int =
        if (i >= cost.size) 0 else cost[i] + minOf(bruteCost(cost, i + 1), bruteCost(cost, i + 2))

    /** 一条一条数：递归往右或往下走。只用在很小的网格上 */
    private fun bruteGrid(grid: Array<IntArray>, r: Int, c: Int): Long {
        if (r >= grid.size || c >= grid[0].size || grid[r][c] == 1) return 0
        if (r == grid.size - 1 && c == grid[0].size - 1) return 1
        return bruteGrid(grid, r + 1, c) + bruteGrid(grid, r, c + 1)
    }

    @Test
    fun `爬楼梯：题目里的例子`() {
        assertEquals(1L, climbStairs(1))
        assertEquals(2L, climbStairs(2))
        assertEquals(3L, climbStairs(3))
        assertEquals(13L, climbStairs(6))
    }

    @Test
    fun `爬楼梯：n = 0 是 1 种，n = 1 也是 1 种，不能越界`() {
        assertEquals(1L, climbStairs(0), "n = 0：站着不动算 1 种。dp 数组开够大了吗？")
        assertEquals(1L, climbStairs(1), "n = 1")
    }

    @Test
    fun `爬楼梯：每一级都等于前两级之和`() {
        for (n in 2..90) {
            assertEquals(climbStairs(n - 1) + climbStairs(n - 2), climbStairs(n), "n = $n")
        }
    }

    @Test
    fun `爬楼梯：n = 90 要用 Long，也不能慢（不能用不带记忆的递归）`() {
        assertEquals(4660046610375530309L, climbStairs(90))
    }

    @Test
    fun `最少体力：题目里的例子`() {
        assertEquals(15, minCostClimbing(intArrayOf(10, 15, 20)))
        assertEquals(6, minCostClimbing(intArrayOf(1, 100, 1, 1, 1, 100, 1, 1, 100, 1)))
    }

    @Test
    fun `最少体力：只有两级，从便宜的那级出发直接跳到顶`() {
        assertEquals(3, minCostClimbing(intArrayOf(3, 8)), "cost = [3, 8]")
        assertEquals(2, minCostClimbing(intArrayOf(9, 2)), "cost = [9, 2]")
        assertEquals(0, minCostClimbing(intArrayOf(0, 0)), "cost = [0, 0]")
    }

    @Test
    fun `最少体力：随机台阶，和穷举一致`() {
        repeat(500) {
            val cost = IntArray(rnd.nextInt(2, 13)) { rnd.nextInt(0, 30) }
            val expect = minOf(bruteCost(cost, 0), bruteCost(cost, 1))
            assertEquals(expect, minCostClimbing(cost), "cost = ${cost.contentToString()}")
        }
    }

    @Test
    fun `数路线：题目里的例子`() {
        val three = arrayOf(intArrayOf(0, 0, 0), intArrayOf(0, 1, 0), intArrayOf(0, 0, 0))
        assertEquals(2L, uniquePathsWithObstacles(three))
        assertEquals(2L, uniquePathsWithObstacles(arrayOf(intArrayOf(0, 0), intArrayOf(0, 0))))
    }

    @Test
    fun `数路线：没有石头就是组合数，结果要用 Long`() {
        // 4 行 5 列：C(7, 3) = 35
        assertEquals(35L, uniquePathsWithObstacles(Array(4) { IntArray(5) }))
        // 18 x 18：C(34, 17) = 2333606220
        assertEquals(2333606220L, uniquePathsWithObstacles(Array(18) { IntArray(18) }), "18 x 18 的网格，没有石头")
    }

    @Test
    fun `数路线：起点或终点是石头，单行单列`() {
        assertEquals(0L, uniquePathsWithObstacles(arrayOf(intArrayOf(1, 0), intArrayOf(0, 0))), "起点是石头")
        assertEquals(0L, uniquePathsWithObstacles(arrayOf(intArrayOf(0, 0), intArrayOf(0, 1))), "终点是石头")
        assertEquals(1L, uniquePathsWithObstacles(arrayOf(intArrayOf(0, 0, 0, 0))), "只有一行")
        assertEquals(1L, uniquePathsWithObstacles(arrayOf(intArrayOf(0), intArrayOf(0), intArrayOf(0))), "只有一列")
        assertEquals(0L, uniquePathsWithObstacles(arrayOf(intArrayOf(0), intArrayOf(1), intArrayOf(0))), "一列里有石头，被堵死")
        assertEquals(1L, uniquePathsWithObstacles(arrayOf(intArrayOf(0))), "1 x 1")
    }

    @Test
    fun `数路线：随机网格，和一条一条数的结果一致`() {
        repeat(500) {
            val rows = rnd.nextInt(1, 7)
            val cols = rnd.nextInt(1, 7)
            val grid = Array(rows) { IntArray(cols) { if (rnd.nextInt(100) < 25) 1 else 0 } }
            val shown = grid.joinToString(" / ") { it.joinToString("") }
            assertEquals(bruteGrid(grid, 0, 0), uniquePathsWithObstacles(grid), "grid（0 路、1 石头，逐行）= $shown")
        }
    }
}
