def climb_stairs(n):
    """爬楼梯：每次跳 1 级或 2 级，到第 n 级有几种跳法。dp[i] = dp[i-1] + dp[i-2]。"""
    dp = [0] * (n + 2)
    dp[0] = 1
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]


def climb_stairs_table(n):
    """返回 dp[0..n] 整张表（n >= 1）。"""
    dp = [0] * (n + 2)
    dp[0] = dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[: n + 1]


def naive_calls(n):
    """不用便签的递归：ways(n) 一共被调用多少次（包括自己）。"""
    return 1 if n <= 1 else 1 + naive_calls(n - 1) + naive_calls(n - 2)


def memo_calls(n):
    """用便签的递归：一共被调用多少次（包括直接抄便签的那几次）。"""
    memo = {}
    calls = 0

    def ways(k):
        nonlocal calls
        calls += 1
        if k <= 1:
            return 1
        if k in memo:
            return memo[k]
        memo[k] = ways(k - 1) + ways(k - 2)
        return memo[k]

    ways(n)
    return calls


def min_cost_climbing(cost):
    """每级台阶有一个体力费用，站上去要付；可以从第 0 级或第 1 级出发，每次跳 1 或 2 级，
    跳过最后一级才算到顶。返回最少体力。dp[i] = 站到第 i 级最少花多少。"""
    n = len(cost)
    dp = [0] * n
    dp[0], dp[1] = cost[0], cost[1]
    for i in range(2, n):
        dp[i] = cost[i] + min(dp[i - 1], dp[i - 2])
    return min(dp[n - 1], dp[n - 2])


def unique_paths_with_obstacles(grid):
    """网格里 1 是石头。从左上走到右下，只能向右或向下。返回整张 dp 表，
    dp[r][c] 是走到这一格有几条路，右下角那格就是答案。"""
    rows, cols = len(grid), len(grid[0])
    dp = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                continue
            if r == 0 and c == 0:
                dp[r][c] = 1
            else:
                dp[r][c] = (dp[r - 1][c] if r > 0 else 0) + (dp[r][c - 1] if c > 0 else 0)
    return dp


if __name__ == "__main__":
    import random

    fib = [1, 1]
    for _ in range(60):
        fib.append(fib[-1] + fib[-2])
    for n in range(0, 60):
        assert climb_stairs(n) == fib[n]
    assert climb_stairs_table(6) == [1, 1, 2, 3, 5, 8, 13]

    for n in range(0, 16):
        assert naive_calls(n) == 2 * climb_stairs(n) - 1
        assert memo_calls(n) == (1 if n <= 1 else 2 * n - 1)

    def brute_cost(cost):
        n = len(cost)

        def go(i):  # 站在第 i 级（已付过费用），到顶还要多少
            if i >= n:
                return 0
            return cost[i] + min(go(i + 1), go(i + 2))

        return min(go(0), go(1))

    assert min_cost_climbing([10, 15, 20]) == 15
    assert min_cost_climbing([1, 100, 1, 1, 1, 100, 1, 1, 100, 1]) == 6
    for _ in range(300):
        c = [random.randint(0, 20) for _ in range(random.randint(2, 10))]
        assert min_cost_climbing(c) == brute_cost(c)

    assert unique_paths_with_obstacles([[0, 0, 0], [0, 1, 0], [0, 0, 0]])[2][2] == 2
    assert unique_paths_with_obstacles([[0, 0], [0, 0]])[1][1] == 2
    assert unique_paths_with_obstacles([[0, 1], [0, 0]])[1][1] == 1
    assert unique_paths_with_obstacles([[0, 1], [1, 0]])[1][1] == 0
    print("dynamic_programming: all tests passed")
