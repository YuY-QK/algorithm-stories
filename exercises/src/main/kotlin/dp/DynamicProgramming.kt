package dp

/*
 * 关卡：动态规划「小兔子爬楼梯」
 *
 * 把下面三个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'dp.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 *
 * 三题的套路一样：先想清楚 dp[i] 表示什么，再想 dp[i] 是从哪几格来的，最后想起点（初始值）。
 */

/**
 * 小兔子爬楼梯：每次跳 1 级或 2 级，到第 [n] 级有几种跳法。n >= 0，n = 0 时算 1 种（站着不动）。
 * n 最大会测到 90，结果要用 Long。
 *
 * 例子：
 *   climbStairs(1) = 1
 *   climbStairs(3) = 3     （1+1+1、1+2、2+1）
 *   climbStairs(6) = 13
 *
 * 提示：dp[i] 表示到第 i 级的跳法数。最后一步要么从 i-1 跳 1 级来，要么从 i-2 跳 2 级来，
 * 所以 dp[i] = dp[i-1] + dp[i-2]。dp[0] 和 dp[1] 是起点，要自己写好。
 * 小心 n = 0 和 n = 1 的时候数组别越界。
 */
fun climbStairs(n: Int): Long {
    TODO("写爬楼梯")
}

/**
 * 花最少的体力爬楼梯：第 i 级台阶上写着 cost[i]，站在这一级往上跳（不管跳 1 级还是 2 级）就要付 cost[i]。
 * 可以从第 0 级或第 1 级出发（出发时还没付费），目标是楼顶，也就是第 cost.size 级。
 * 返回最少要付多少。cost.size >= 2。
 *
 * 例子：
 *   minCostClimbing(intArrayOf(10, 15, 20)) = 15     （从第 1 级出发，付 15，直接跳 2 级到顶）
 *   minCostClimbing(intArrayOf(1, 100, 1, 1, 1, 100, 1, 1, 100, 1)) = 6
 *
 * 提示：dp[i] 表示到第 i 级最少已经付了多少。到第 i 级的最后一步，要么从 i-1 来（付 cost[i-1]），
 * 要么从 i-2 来（付 cost[i-2]），取小的。dp[0] = dp[1] = 0，答案是 dp[cost.size]。
 */
fun minCostClimbing(cost: IntArray): Int {
    TODO("写最少体力爬楼梯")
}

/**
 * 网格数路线：从左上角 (0, 0) 走到右下角，每次只能向右或向下走一格。
 * [grid] 里 0 是路，1 是石头，石头不能踩。返回一共有几条路。起点或终点是石头时没有路，返回 0。
 * 网格最大 30 x 30，结果要用 Long。
 *
 * 例子：
 *   uniquePathsWithObstacles(arrayOf(intArrayOf(0, 0, 0), intArrayOf(0, 1, 0), intArrayOf(0, 0, 0))) = 2
 *   uniquePathsWithObstacles(arrayOf(intArrayOf(0, 0), intArrayOf(0, 0))) = 2
 *
 * 提示：dp[r][c] 表示走到 (r, c) 有几条路。最后一步要么从上面来，要么从左边来，
 * 所以 dp[r][c] = dp[r-1][c] + dp[r][c-1]；石头那一格是 0。第一行和第一列没有「上面」或「左边」，别越界。
 * 网页「做 → 挑战」里的填表，就是这一题。
 */
fun uniquePathsWithObstacles(grid: Array<IntArray>): Long {
    TODO("写网格数路线")
}
