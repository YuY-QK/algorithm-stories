package dfs

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals

class DfsTest {
    private val rnd = Random(42)

    private fun show(grid: List<String>) = grid.joinToString("\n", prefix = "\n", postfix = "\n")

    private fun randomCave(maxSide: Int = 7): List<String> {
        val h = rnd.nextInt(1, maxSide + 1)
        val w = rnd.nextInt(2, maxSide + 1)
        val cells = Array(h) { CharArray(w) { if (rnd.nextDouble() < 0.3) '#' else '.' } }
        val (a, b) = (0 until h * w).shuffled(rnd).take(2)
        cells[a / w][a % w] = 'S'
        cells[b / w][b % w] = 'E'
        return cells.map { String(it) }
    }

    private fun randomSea(): List<String> {
        val h = rnd.nextInt(1, 9)
        val w = rnd.nextInt(1, 9)
        return List(h) { String(CharArray(w) { if (rnd.nextDouble() < 0.45) '1' else '0' }) }
    }

    /** 笨办法数岛：并查集 */
    private fun slowIslands(g: List<String>): Int {
        val h = g.size
        val w = g[0].length
        val parent = IntArray(h * w) { it }
        fun find(x: Int): Int {
            var y = x
            while (parent[y] != y) y = parent[y]
            return y
        }
        for (r in 0 until h) for (c in 0 until w) {
            if (g[r][c] != '1') continue
            if (c + 1 < w && g[r][c + 1] == '1') parent[find(r * w + c)] = find(r * w + c + 1)
            if (r + 1 < h && g[r + 1][c] == '1') parent[find(r * w + c)] = find((r + 1) * w + c)
        }
        return (0 until h * w).filter { g[it / w][it % w] == '1' }.map { find(it) }.toSet().size
    }

    /** 笨办法：反复扩张，直到走不出新格子 */
    private fun slowReach(g: List<String>): Boolean {
        val got = mutableSetOf(findCell(g, 'S'))
        var changed = true
        while (changed) {
            changed = false
            for ((r, c) in got.toList()) for ((dr, dc) in DIRS) {
                val nr = r + dr
                val nc = c + dc
                if (nr in g.indices && nc in g[0].indices && g[nr][nc] != '#' && got.add(nr to nc)) changed = true
            }
        }
        return findCell(g, 'E') in got
    }

    /** 笨办法数路线：用显式的栈，每个栈元素是一条还没走完的路 */
    private fun slowPaths(g: List<String>): Int {
        val end = findCell(g, 'E')
        val todo = ArrayDeque<List<Pair<Int, Int>>>()
        todo.add(listOf(findCell(g, 'S')))
        var count = 0
        while (todo.isNotEmpty()) {
            val path = todo.removeLast()
            val (r, c) = path.last()
            if (r to c == end) {
                count++
                continue
            }
            for ((dr, dc) in DIRS) {
                val n = (r + dr) to (c + dc)
                if (n.first in g.indices && n.second in g[0].indices && g[n.first][n.second] != '#' && n !in path) todo.add(path + n)
            }
        }
        return count
    }

    @Test
    fun `numIslands：题目里的例子`() {
        assertEquals(2, numIslands(listOf("110", "110", "001")))
        assertEquals(0, numIslands(listOf("000", "000")))
        assertEquals(1, numIslands(listOf("111")))
    }

    @Test
    fun `numIslands：斜着碰头不算连`() {
        val g = listOf("10", "01")
        assertEquals(2, numIslands(g), "斜着的两块陆地不是一座岛。海图：" + show(g))
    }

    @Test
    fun `numIslands：随机海图`() {
        repeat(2000) {
            val g = randomSea()
            assertEquals(slowIslands(g), numIslands(g), "海图：" + show(g))
        }
    }

    @Test
    fun `hasPath：简单的例子`() {
        assertEquals(true, hasPath(listOf("S.E")))
        assertEquals(false, hasPath(listOf("S#E")))
        assertEquals(true, hasPath(listOf("S#.", "..E")))
    }

    @Test
    fun `hasPath：要绕过死胡同`() {
        val g = listOf(
            "S.#..",
            ".##.#",
            "....E",
            "#.###",
            ".....",
        )
        assertEquals(true, hasPath(g), "碰到死路要退回去试别的方向。山洞：" + show(g))
    }

    @Test
    fun `hasPath：随机山洞`() {
        repeat(2000) {
            val g = randomCave()
            assertEquals(slowReach(g), hasPath(g), "山洞：" + show(g))
        }
    }

    @Test
    fun `hasPath：中等大小的空房间不会重复走`() {
        val g = List(30) { r -> String(CharArray(30) { c -> if (r == 0 && c == 0) 'S' else if (r == 29 && c == 29) 'E' else '.' }) }
        assertEquals(true, hasPath(g), "如果卡住不动，看看是不是忘了标记 visited")
    }

    @Test
    fun `countPaths：题目里的例子`() {
        assertEquals(2, countPaths(listOf("S.", ".E")))
        assertEquals(0, countPaths(listOf("S#E")))
        assertEquals(1, countPaths(listOf("S.E")))
    }

    @Test
    fun `countPaths：同一个格子可以被不同的路线经过`() {
        // 3x3 的空房间，从左上到右下有 12 条不重复格子的路
        val g = listOf("S..", "...", "..E")
        assertEquals(12, countPaths(g), "退出格子时要擦掉 visited 标记（回溯）。山洞：" + show(g))
    }

    @Test
    fun `countPaths：随机小山洞`() {
        repeat(300) {
            val g = randomCave(4)
            assertEquals(slowPaths(g), countPaths(g), "山洞：" + show(g))
        }
    }
}
