package greedy

// 参考答案。自己写完、测试通过以后再来对照。

fun greedyChange(coins: IntArray, amount: Int): List<Int> {
    val sorted = coins.sortedDescending()
    val picked = mutableListOf<Int>()
    var left = amount
    for (c in sorted) {
        while (left >= c) {
            picked.add(c)
            left -= c
        }
    }
    return picked
}

fun minCoins(coins: IntArray, amount: Int): Int {
    val inf = Int.MAX_VALUE
    val best = IntArray(amount + 1) { inf }
    best[0] = 0
    for (x in 1..amount) {
        for (c in coins) {
            // 最后一枚是 c：前面要先凑出 x - c
            if (c <= x && best[x - c] != inf && best[x - c] + 1 < best[x]) best[x] = best[x - c] + 1
        }
    }
    return if (best[amount] == inf) -1 else best[amount]
}
