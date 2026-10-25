package dp

// 参考答案。自己写完、测试通过以后再来对照。

fun climbStairs(n: Int): Long {
    val dp = LongArray(n + 2) // 多开一格，n = 0 时 dp[1] 也不会越界
    dp[0] = 1
    dp[1] = 1
    for (i in 2..n) {
        dp[i] = dp[i - 1] + dp[i - 2]
    }
    return dp[n]
}

fun minCostClimbing(cost: IntArray): Int {
    val n = cost.size
    val dp = IntArray(n + 1) // dp[i]：到第 i 级最少已经付了多少；dp[0] = dp[1] = 0
    for (i in 2..n) {
        dp[i] = minOf(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2])
    }
    return dp[n]
}

fun uniquePathsWithObstacles(grid: Array<IntArray>): Long {
    val rows = grid.size
    val cols = grid[0].size
    val dp = Array(rows) { LongArray(cols) }
    for (r in 0 until rows) {
        for (c in 0 until cols) {
            if (grid[r][c] == 1) continue // 石头：0 条路
            dp[r][c] = if (r == 0 && c == 0) 1 else {
                (if (r > 0) dp[r - 1][c] else 0) + (if (c > 0) dp[r][c - 1] else 0)
            }
        }
    }
    return dp[rows - 1][cols - 1]
}
