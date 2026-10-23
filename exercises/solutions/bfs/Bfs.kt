package bfs

// 参考答案。自己写完、测试通过以后再来对照。

val DIRS = listOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1)

fun findCell(grid: List<String>, ch: Char): Pair<Int, Int> {
    for (r in grid.indices) {
        val c = grid[r].indexOf(ch)
        if (c >= 0) return r to c
    }
    error("迷宫里没有 $ch")
}

fun shortestPath(grid: List<String>): Int {
    val h = grid.size
    val w = grid[0].length
    val start = findCell(grid, 'S')
    val dist = Array(h) { IntArray(w) }
    val visited = Array(h) { BooleanArray(w) }
    val queue = ArrayDeque<Pair<Int, Int>>()
    queue.addLast(start)
    visited[start.first][start.second] = true
    while (queue.isNotEmpty()) {
        val (r, c) = queue.removeFirst()
        if (grid[r][c] == 'E') return dist[r][c]
        for ((dr, dc) in DIRS) {
            val nr = r + dr
            val nc = c + dc
            if (nr !in 0 until h || nc !in 0 until w) continue
            if (grid[nr][nc] == '#' || visited[nr][nc]) continue
            visited[nr][nc] = true // 入队时就标记，同一格只进一次队
            dist[nr][nc] = dist[r][c] + 1
            queue.addLast(nr to nc)
        }
    }
    return -1
}

fun shortestRoute(grid: List<String>): List<Pair<Int, Int>> {
    val h = grid.size
    val w = grid[0].length
    val start = findCell(grid, 'S')
    // parent[r][c]：从哪一格走到 (r, c)；null 表示还没来过
    val parent = Array(h) { arrayOfNulls<Pair<Int, Int>>(w) }
    parent[start.first][start.second] = start
    val queue = ArrayDeque(listOf(start))
    while (queue.isNotEmpty()) {
        val cur = queue.removeFirst()
        if (grid[cur.first][cur.second] == 'E') {
            val route = mutableListOf(cur)
            while (route.last() != start) route.add(parent[route.last().first][route.last().second]!!)
            return route.reversed()
        }
        for ((dr, dc) in DIRS) {
            val nr = cur.first + dr
            val nc = cur.second + dc
            if (nr !in 0 until h || nc !in 0 until w) continue
            if (grid[nr][nc] == '#' || parent[nr][nc] != null) continue
            parent[nr][nc] = cur
            queue.addLast(nr to nc)
        }
    }
    return emptyList()
}
