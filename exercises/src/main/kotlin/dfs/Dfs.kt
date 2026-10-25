package dfs

/*
 * 关卡：深度优先搜索「探险家走山洞」
 *
 * 把下面三个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'dfs.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 *
 * 山洞是一组一样长的字符串：'#' 岩石、'.' 空地、'S' 起点（探险家）、'E' 终点（宝藏）。
 * 海图也是一组一样长的字符串：'1' 陆地、'0' 海。
 * 每一步只能往上、下、左、右走一格，不能穿墙，不能走出地图。
 */

/** 四个方向：上、右、下、左。(dr, dc) 是行和列的变化 */
val DIRS = listOf(-1 to 0, 0 to 1, 1 to 0, 0 to -1)

/** 找到字符 [ch] 所在的格子 (行, 列)，行和列都从 0 开始 */
fun findCell(grid: List<String>, ch: Char): Pair<Int, Int> {
    for (r in grid.indices) {
        val c = grid[r].indexOf(ch)
        if (c >= 0) return r to c
    }
    error("地图里没有 $ch")
}

/**
 * 数岛屿：上下左右连在一起的 '1' 算一座岛（斜着碰头不算连）。
 *
 * 例子：
 *   110
 *   110      返回 2
 *   001
 *
 * 提示：外层扫描每个格子，碰到一块还没访问的陆地就计数 +1，
 * 然后用 DFS 把这座岛的所有陆地都标记成访问过（洪水填充）。
 */
fun numIslands(grid: List<String>): Int {
    TODO("写数岛屿")
}

/**
 * 山洞里 S 能不能走到 E。
 *
 * 例子：
 *   S#.
 *   ..E      返回 true：先下、再右、再右
 *
 *   S#E      返回 false：岩石挡住了
 *
 * 提示：写一个递归的 dfs(r, c)。进格子先检查出界、岩石、visited，再标记 visited；
 * 是 E 就返回 true；四个方向只要有一个递归返回 true，这一层就返回 true。
 */
fun hasPath(grid: List<String>): Boolean {
    TODO("写 DFS")
}

/**
 * 回溯变种：S 走到 E 一共有几条路。每条路里同一个格子不能走两次，不同的走法算不同的路。
 *
 * 例子：
 *   S.
 *   .E      返回 2（先右后下、先下后右）
 *
 * 提示：和 hasPath 不同，这里进格子时标记 visited，从格子退出时要把标记擦掉（回溯），
 * 这样别的路线还能经过它。走到 E 就算一条，返回 1，不用再往下走。
 */
fun countPaths(grid: List<String>): Int {
    TODO("写带回溯的 DFS")
}
