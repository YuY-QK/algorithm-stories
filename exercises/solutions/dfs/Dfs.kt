package dfs

// 参考答案。自己写完、测试通过以后再来对照。

val DIRS = listOf(-1 to 0, 0 to 1, 1 to 0, 0 to -1)

fun findCell(grid: List<String>, ch: Char): Pair<Int, Int> {
    for (r in grid.indices) {
        val c = grid[r].indexOf(ch)
        if (c >= 0) return r to c
    }
    error("地图里没有 $ch")
}

fun numIslands(grid: List<String>): Int {
    val h = grid.size
    val w = grid[0].length
    val visited = Array(h) { BooleanArray(w) }

    fun fill(r: Int, c: Int) {
        if (r !in 0 until h || c !in 0 until w) return
        if (grid[r][c] != '1' || visited[r][c]) return
        visited[r][c] = true
        for ((dr, dc) in DIRS) fill(r + dr, c + dc)
    }

    var count = 0
    for (r in 0 until h) for (c in 0 until w) {
        if (grid[r][c] == '1' && !visited[r][c]) {
            count++
            fill(r, c)
        }
    }
    return count
}

fun hasPath(grid: List<String>): Boolean {
    val h = grid.size
    val w = grid[0].length
    val start = findCell(grid, 'S')
    val visited = Array(h) { BooleanArray(w) }

    fun dfs(r: Int, c: Int): Boolean {
        if (r !in 0 until h || c !in 0 until w) return false
        if (grid[r][c] == '#' || visited[r][c]) return false
        visited[r][c] = true
        if (grid[r][c] == 'E') return true
        for ((dr, dc) in DIRS) {
            if (dfs(r + dr, c + dc)) return true
        }
        return false
    }
    return dfs(start.first, start.second)
}

fun countPaths(grid: List<String>): Int {
    val h = grid.size
    val w = grid[0].length
    val start = findCell(grid, 'S')
    val visited = Array(h) { BooleanArray(w) }

    fun go(r: Int, c: Int): Int {
        if (r !in 0 until h || c !in 0 until w) return 0
        if (grid[r][c] == '#' || visited[r][c]) return 0
        if (grid[r][c] == 'E') return 1
        visited[r][c] = true
        var total = 0
        for ((dr, dc) in DIRS) total += go(r + dr, c + dc)
        visited[r][c] = false // 回溯：退出时擦掉标记，别的路线还能经过这里
        return total
    }
    return go(start.first, start.second)
}
