package bfs

/*
 * 关卡：广度优先搜索「小老鼠走迷宫」
 *
 * 把下面两个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'bfs.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 *
 * 迷宫是一组一样长的字符串：'#' 墙、'.' 空地、'S' 起点（小老鼠）、'E' 终点（奶酪）。
 * 每一步只能往上、下、左、右走一格，不能穿墙，不能走出迷宫。
 */

/** 四个方向：上、下、左、右。(dr, dc) 是行和列的变化 */
val DIRS = listOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1)

/** 找到字符 [ch] 所在的格子 (行, 列)，行和列都从 0 开始 */
fun findCell(grid: List<String>, ch: Char): Pair<Int, Int> {
    for (r in grid.indices) {
        val c = grid[r].indexOf(ch)
        if (c >= 0) return r to c
    }
    error("迷宫里没有 $ch")
}

/**
 * 从 S 走到 E 最少要几步；走不到返回 -1。
 *
 * 例子：
 *   S..
 *   ##.      最少 6 步：右、右、下、下、左、左
 *   E..
 *
 * 提示：用 ArrayDeque 当队列（addLast 入队、removeFirst 出队），
 * 格子入队的时候就标记「来过了」，同一个格子只能进一次队。
 */
fun shortestPath(grid: List<String>): Int {
    TODO("写你的 BFS")
}

/**
 * 变种：返回一条最短路线，从 S 开始、到 E 结束，包括两端的格子；走不到返回空列表。
 * 最短路线可能不止一条，返回任意一条都算对。
 *
 * 例子：上面的迷宫返回 [(0,0), (0,1), (0,2), (1,2), (2,2), (2,1), (2,0)]
 *
 * 提示：入队时记下每个格子是从哪一格走过来的（parent），
 * 走到 E 以后顺着 parent 倒着走回 S，再把列表翻过来。
 */
fun shortestRoute(grid: List<String>): List<Pair<Int, Int>> {
    TODO("写返回路线的 BFS")
}
