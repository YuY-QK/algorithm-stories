package bfs

import kotlin.math.abs
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class BfsTest {
    private val rnd = Random(42)

    private fun show(grid: List<String>) = grid.joinToString("\n", prefix = "\n", postfix = "\n")

    /** 随机迷宫：三成是墙，S、E 位置随机 */
    private fun randomGrid(): List<String> {
        val h = rnd.nextInt(1, 9)
        val w = rnd.nextInt(2, 9)
        val cells = Array(h) { CharArray(w) { if (rnd.nextDouble() < 0.3) '#' else '.' } }
        val (a, b) = (0 until h * w).shuffled(rnd).take(2)
        cells[a / w][a % w] = 'S'
        cells[b / w][b % w] = 'E'
        return cells.map { String(it) }
    }

    /** 笨办法：反复松弛，直到没有格子能变得更近，用来核对 */
    private fun slowShortest(grid: List<String>): Int {
        val h = grid.size
        val w = grid[0].length
        val inf = Int.MAX_VALUE
        val d = Array(h) { IntArray(w) { inf } }
        val (sr, sc) = findCell(grid, 'S')
        d[sr][sc] = 0
        var changed = true
        while (changed) {
            changed = false
            for (r in 0 until h) for (c in 0 until w) {
                if (grid[r][c] == '#' || d[r][c] == inf) continue
                for ((dr, dc) in DIRS) {
                    val nr = r + dr
                    val nc = c + dc
                    if (nr in 0 until h && nc in 0 until w && grid[nr][nc] != '#' && d[r][c] + 1 < d[nr][nc]) {
                        d[nr][nc] = d[r][c] + 1
                        changed = true
                    }
                }
            }
        }
        val (er, ec) = findCell(grid, 'E')
        return if (d[er][ec] == inf) -1 else d[er][ec]
    }

    private val example = listOf(
        "S..",
        "##.",
        "E..",
    )

    @Test
    fun `题目里的例子`() {
        assertEquals(6, shortestPath(example))
    }

    @Test
    fun `挨着的起点和终点`() {
        assertEquals(1, shortestPath(listOf("SE")))
        assertEquals(1, shortestPath(listOf("S", "E")))
    }

    @Test
    fun `被墙挡住走不到返回 -1`() {
        assertEquals(-1, shortestPath(listOf("S#E")))
        assertEquals(-1, shortestPath(listOf("S.#", "..#", "##E")))
    }

    @Test
    fun `终点在最下面一行和最右边一列也不会越界`() {
        assertEquals(4, shortestPath(listOf("S..", "...", "..E")), "检查一下出界的判断：下标只能是 0 until h")
    }

    @Test
    fun `有近路也有远路时要返回近的`() {
        val grid = listOf(
            ".......",
            ".##.##.",
            ".#...#.",
            ".#.S.#.",
            ".#...#.",
            ".##.##.",
            "......E",
        )
        assertEquals(6, shortestPath(grid), "取格子是从队首取（removeFirst）吗？" + show(grid))
    }

    @Test
    fun `大的空房间也很快，不会重复入队`() {
        val grid = List(200) { r -> String(CharArray(200) { c -> if (r == 0 && c == 0) 'S' else if (r == 199 && c == 199) 'E' else '.' }) }
        assertEquals(398, shortestPath(grid), "如果卡住或内存不够，看看是不是忘了标记 visited")
    }

    @Test
    fun `随机迷宫`() {
        repeat(2000) {
            val g = randomGrid()
            assertEquals(slowShortest(g), shortestPath(g), "迷宫：" + show(g))
        }
    }

    /** 路线合法：从 S 到 E，一步一格，不穿墙，长度是最短的 */
    private fun checkRoute(g: List<String>) {
        val best = slowShortest(g)
        val route = shortestRoute(g)
        if (best < 0) {
            assertEquals(emptyList(), route, "走不到时应该返回空列表。迷宫：" + show(g))
            return
        }
        assertEquals(best + 1, route.size, "路线的格子数应该是最短步数 + 1。迷宫：" + show(g) + "你的路线：$route")
        assertEquals(findCell(g, 'S'), route.first(), "路线要从 S 开始。迷宫：" + show(g))
        assertEquals(findCell(g, 'E'), route.last(), "路线要在 E 结束。迷宫：" + show(g))
        for (k in 1 until route.size) {
            val (r0, c0) = route[k - 1]
            val (r1, c1) = route[k]
            assertTrue(abs(r0 - r1) + abs(c0 - c1) == 1, "第 $k 步从 ${route[k - 1]} 到 ${route[k]} 不是挨着的一格。迷宫：" + show(g))
            assertTrue(g[r1][c1] != '#', "${route[k]} 是墙。迷宫：" + show(g))
        }
    }

    @Test
    fun `shortestRoute：题目里的例子`() {
        assertEquals(listOf(0 to 0, 0 to 1, 0 to 2, 1 to 2, 2 to 2, 2 to 1, 2 to 0), shortestRoute(example))
        assertEquals(emptyList(), shortestRoute(listOf("S#E")))
    }

    @Test
    fun `shortestRoute：随机迷宫`() {
        repeat(2000) { checkRoute(randomGrid()) }
    }
}
