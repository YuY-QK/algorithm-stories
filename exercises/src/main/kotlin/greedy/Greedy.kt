package greedy

/*
 * 关卡：贪心算法「小熊的小卖部」
 *
 * 把下面两个函数里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'greedy.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 */

/**
 * 贪心找零：每次都拿「不超过剩下金额的最大面值」，返回拿到的硬币，按拿的顺序（从大到小）。
 * [coins] 里的面值都是正数、互不相同、顺序随意，并且一定有 1，所以总能凑齐。
 *
 * 例子：
 *   greedyChange(intArrayOf(1, 2, 5, 10, 20, 50), 46) = [20, 20, 5, 1]
 *   greedyChange(intArrayOf(1, 3, 4), 6) = [4, 1, 1]    ← 3 枚，其实 3 + 3 只要 2 枚
 *
 * 提示：先排序；同一种面值可能要拿好几枚。
 */
fun greedyChange(coins: IntArray, amount: Int): List<Int> {
    TODO("写贪心找零")
}

/**
 * 动态规划：凑出 [amount] 最少要几枚硬币；凑不出来返回 -1。每种面值的硬币数量不限。
 * [coins] 里的面值都是正数、互不相同，不一定有 1。amount = 0 时返回 0。
 *
 * 例子：
 *   minCoins(intArrayOf(1, 3, 4), 6) = 2       （3 + 3，贪心要 3 枚）
 *   minCoins(intArrayOf(2), 3) = -1
 *
 * 提示：best[x] 表示凑出 x 最少要几枚。最后一枚是 c 的话，前面要凑出 x - c，
 * 所以 best[x] = min(best[x - c] + 1)，c 取所有不超过 x、并且 x - c 凑得出来的面值。
 * 从 best[0] = 0 开始，x 从小到大填表。
 */
fun minCoins(coins: IntArray, amount: Int): Int {
    TODO("写动态规划版本")
}
