def greedy_change(coins, amount):
    """贪心找零：面值从大到小，每种能拿就一直拿。返回拿到的硬币（从大到小）。"""
    picked = []
    left = amount
    for c in sorted(set(coins), reverse=True):
        while left >= c:
            picked.append(c)
            left -= c
    return picked


def min_coins(coins, amount):
    """动态规划：凑出 amount 最少要几枚硬币；凑不出来返回 -1。best[x] = min(best[x - c] + 1)。"""
    inf = float("inf")
    best = [0] + [inf] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x and best[x - c] + 1 < best[x]:
                best[x] = best[x - c] + 1
    return -1 if best[amount] == inf else best[amount]


def counterexample(coins):
    """贪心失灵的最小金额（面值里要有 1）；贪心总是最少时返回 None。只需查到最大两种面值之和（Kozen & Zaks 1994）。"""
    cs = sorted(set(coins), reverse=True)
    limit = cs[0] + cs[1] if len(cs) >= 2 else cs[0]
    for x in range(1, limit):
        if len(greedy_change(cs, x)) > min_coins(cs, x):
            return x
    return None


def _brute_min(coins, amount):
    """宽度优先搜索：一枚一枚加，最先凑到 amount 的层数就是最少枚数。只用来核对。"""
    if amount == 0:
        return 0
    seen = {0}
    frontier = [0]
    depth = 0
    while frontier:
        depth += 1
        nxt = []
        for s in frontier:
            for c in coins:
                t = s + c
                if t == amount:
                    return depth
                if t < amount and t not in seen:
                    seen.add(t)
                    nxt.append(t)
        frontier = nxt
    return -1


if __name__ == "__main__":
    import random

    assert greedy_change([1, 2, 5, 10, 20, 50], 46) == [20, 20, 5, 1]
    assert greedy_change([1, 3, 4], 6) == [4, 1, 1]
    assert min_coins([1, 3, 4], 6) == 2
    assert min_coins([2], 3) == -1
    assert min_coins([5, 7], 0) == 0
    assert counterexample([1, 5, 10, 25]) is None
    assert counterexample([1, 2, 5, 10, 20, 50]) is None
    assert counterexample([1, 2, 5, 10, 20, 50, 100, 200]) is None  # 欧元硬币（分）
    assert counterexample([1, 5, 10, 50, 100, 200, 500, 1000]) is None  # 人民币现行面值（角）
    assert counterexample([1, 3, 4]) == 6
    assert counterexample([1, 5, 10, 20, 25]) == 40
    assert counterexample([1, 3, 6, 12, 24, 30]) == 48

    for _ in range(400):
        coins = random.sample(range(1, 30), random.randint(1, 5))
        for amount in range(0, 80):
            assert min_coins(coins, amount) == _brute_min(coins, amount), (coins, amount)
        with_one = sorted(set(coins + [1]))
        for amount in range(0, 120):
            g = greedy_change(with_one, amount)
            assert sum(g) == amount
            assert len(g) >= min_coins(with_one, amount)
        # 最大两种面值之和以内没有反例，就再往后查一段也没有
        if counterexample(with_one) is None:
            for amount in range(0, 3 * max(with_one) + 10):
                assert len(greedy_change(with_one, amount)) == min_coins(with_one, amount), (with_one, amount)
    print("greedy: all tests passed")
