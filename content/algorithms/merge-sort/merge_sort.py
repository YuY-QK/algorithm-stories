def merge_sort(arr, lo=0, hi=None, counter=None):
    """把 arr[lo:hi] 原地排成升序，返回 a[i] <= a[j] 一共比较了几次。

    和网页「做」里的 Kotlin 代码一一对应：区间是左闭右开 [lo, hi)，
    mid = (lo + hi) // 2，左半 [lo, mid)，右半 [mid, hi)。
    """
    if hi is None:
        hi = len(arr)
    if counter is None:
        counter = [0]
    if hi - lo <= 1:
        return counter[0]
    mid = (lo + hi) // 2
    merge_sort(arr, lo, mid, counter)
    merge_sort(arr, mid, hi, counter)
    tmp = [0] * (hi - lo)
    i, j, k = lo, mid, 0
    while i < mid and j < hi:
        counter[0] += 1
        if arr[i] <= arr[j]:  # 相等时取左边，保持稳定
            tmp[k] = arr[i]
            i += 1
        else:
            tmp[k] = arr[j]
            j += 1
        k += 1
    while i < mid:
        tmp[k] = arr[i]
        i += 1
        k += 1
    while j < hi:
        tmp[k] = arr[j]
        j += 1
        k += 1
    arr[lo:hi] = tmp
    return counter[0]


def merge(a, b):
    """合并两个已经排好的列表，返回新列表。相等时取 a 的。"""
    out = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out


def count_inversions(arr):
    """逆序对数：前面比后面大的一对算一个。归并时右边的先走，它就和左边剩下的每一个都构成逆序对。"""

    def rec(a):
        if len(a) <= 1:
            return a, 0
        mid = len(a) // 2
        left, x = rec(a[:mid])
        right, y = rec(a[mid:])
        out, i, j, c = [], 0, 0, x + y
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                out.append(left[i])
                i += 1
            else:
                out.append(right[j])
                j += 1
                c += len(left) - i
        out.extend(left[i:])
        out.extend(right[j:])
        return out, c

    return rec(list(arr))[1]


def compare_bounds(n):
    """n 个元素的归并排序，比较次数最少和最多是多少。"""
    if n <= 1:
        return 0, 0
    l = n // 2
    r = n - l
    a, b = compare_bounds(l), compare_bounds(r)
    return a[0] + b[0] + min(l, r), a[1] + b[1] + n - 1


if __name__ == "__main__":
    import itertools
    import random

    for n in (0, 1, 2, 3, 7, 8, 30):
        for _ in range(300):
            a = [random.randint(1, 6) for _ in range(n)]
            b = list(a)
            c = merge_sort(b)
            assert b == sorted(a)
            lo, hi = compare_bounds(n)
            assert lo <= c <= hi
            inv = sum(1 for x in range(n) for y in range(x + 1, n) if a[x] > a[y])
            assert count_inversions(a) == inv
            half = n // 2
            assert merge(sorted(a[:half]), sorted(a[half:])) == sorted(a)

    # 稳定：只比点数，排完相等的牌位置仍然递增
    class Card:
        def __init__(self, v, at):
            self.v, self.at = v, at

        def __le__(self, other):
            return self.v <= other.v

    hand = [Card(v, at) for at, v in enumerate([3, 1, 3, 2])]
    merge_sort(hand)
    assert [(c.v, c.at) for c in hand] == [(1, 1), (2, 3), (3, 0), (3, 2)]

    # 8 个元素：最少 12 次，最多 17 次（穷举核对）
    counts = {merge_sort(list(p)) for p in itertools.permutations(range(8))}
    assert min(counts) == 12 and max(counts) == 17 and compare_bounds(8) == (12, 17)
    # 故事里的 6 只小动物：前后两半各自排好以后合并，比较 4 次
    assert merge(sorted([5, 2, 6]), sorted([1, 4, 3])) == [1, 2, 3, 4, 5, 6]
    print("merge_sort: all tests passed")
