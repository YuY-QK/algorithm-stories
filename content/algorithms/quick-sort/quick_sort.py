"""快速排序（Lomuto 分区，最后一个元素当标杆）的参考实现。

和 src/engine/quick-sort.ts 的 buildTrace 对拍：
比较次数数的是 arr[j] < pivot 算了几次，交换次数数的是 swap 执行了几次（包括自己和自己换、最后把标杆换到位）。
"""
import random


def partition(arr, lo, hi, stats=None):
    """Lomuto 分区：以 arr[hi] 为标杆，返回标杆最后所在的下标 p。
    返回后 arr[lo:p] 都比标杆小，arr[p+1:hi+1] 都不比标杆小。"""
    pivot = arr[hi]
    i = lo - 1
    for j in range(lo, hi):
        if stats is not None:
            stats["compares"] += 1
        if arr[j] < pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
            if stats is not None:
                stats["swaps"] += 1
    arr[i + 1], arr[hi] = arr[hi], arr[i + 1]
    if stats is not None:
        stats["swaps"] += 1
    return i + 1


def quick_sort(arr):
    """把 arr 原地排成升序，返回 (比较次数, 交换次数, 调用次数, 最大递归深度)。

    调用次数数的是 quickSort 被调用了几次（包括空区间和只有一个元素的区间），
    最大递归深度是同时存在的 quickSort 调用最多有几层。
    """
    stats = {"compares": 0, "swaps": 0, "calls": 0, "depth": 0}

    def go(lo, hi, depth):
        stats["calls"] += 1
        stats["depth"] = max(stats["depth"], depth)
        if lo >= hi:
            return
        p = partition(arr, lo, hi, stats)
        go(lo, p - 1, depth + 1)
        go(p + 1, hi, depth + 1)

    go(0, len(arr) - 1, 1)
    return stats["compares"], stats["swaps"], stats["calls"], stats["depth"]


def quick_select(arr, k):
    """返回第 k 小的元素（k 从 1 开始），会打乱 arr 的顺序。"""
    if not 1 <= k <= len(arr):
        raise ValueError("k 要在 1 到 len(arr) 之间")
    lo, hi = 0, len(arr) - 1
    while True:
        r = random.randint(lo, hi)
        arr[r], arr[hi] = arr[hi], arr[r]
        p = partition(arr, lo, hi)
        if p == k - 1:
            return arr[p]
        if p > k - 1:
            hi = p - 1
        else:
            lo = p + 1


def compares_sorted_last(n):
    """已经排好的 n 个数，每次拿最后一个当标杆：n(n-1)/2 次。"""
    return sum(range(n))


if __name__ == "__main__":
    for n in (0, 1, 2, 3, 8, 30):
        for _ in range(300):
            a = [random.randint(1, 6) for _ in range(n)]
            b = list(a)
            compares, swaps, calls, depth = quick_sort(b)
            assert b == sorted(a), (a, b)
            if n >= 2:
                assert compares >= n - 1
                assert compares <= n * (n - 1) // 2
    # 分区后：标杆在 p，左边都比它小，右边都不比它小
    for _ in range(500):
        a = [random.randint(1, 9) for _ in range(random.randint(1, 12))]
        lo = random.randint(0, len(a) - 1)
        hi = random.randint(lo, len(a) - 1)
        pv = a[hi]
        b = list(a)
        p = partition(b, lo, hi)
        assert lo <= p <= hi and b[p] == pv
        assert all(x < pv for x in b[lo:p]) and all(x >= pv for x in b[p + 1 : hi + 1])
        assert b[:lo] == a[:lo] and b[hi + 1 :] == a[hi + 1 :]
        assert sorted(b) == sorted(a)
    # 已经排好或倒序，最后一个当标杆：最坏情况 n(n-1)/2 次
    for n in (2, 5, 10, 40):
        for a in (list(range(n)), list(range(n, 0, -1))):
            compares, _, _, depth = quick_sort(list(a))
            assert compares == n * (n - 1) // 2 == compares_sorted_last(n)
            assert depth >= n - 1
    # 第 k 小
    for _ in range(500):
        a = [random.randint(1, 8) for _ in range(random.randint(1, 15))]
        k = random.randint(1, len(a))
        assert quick_select(list(a), k) == sorted(a)[k - 1]
    print("passed")
