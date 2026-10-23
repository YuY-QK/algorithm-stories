def selection_sort(a):
    """原地把列表 a 从小到大排好，返回 a。每轮从剩下的里面挑最小的，换到最前面。"""
    n = len(a)
    for i in range(n - 1):  # 最后一个不用挑，所以只有 n-1 轮
        min_idx = i
        for j in range(i + 1, n):
            if a[j] < a[min_idx]:  # 用 < ：一样小时留住最前面那个
                min_idx = j
        if min_idx != i:
            a[i], a[min_idx] = a[min_idx], a[i]
    return a


def count_ops(a):
    """返回 (比较次数, 交换次数)，不修改 a。"""
    a, n, cmp, swp = list(a), len(a), 0, 0
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            cmp += 1
            if a[j] < a[min_idx]:
                min_idx = j
        if min_idx != i:
            a[i], a[min_idx] = a[min_idx], a[i]
            swp += 1
    return cmp, swp


def kth_smallest(a, k):
    """第 k 小（k 从 1 开始）：只做 k 轮选择。会修改 a。"""
    for i in range(k):
        min_idx = i
        for j in range(i + 1, len(a)):
            if a[j] < a[min_idx]:
                min_idx = j
        a[i], a[min_idx] = a[min_idx], a[i]
    return a[k - 1]


if __name__ == "__main__":
    import random

    for n in (0, 1, 2, 3, 7, 30):
        for _ in range(300):
            arr = [random.randint(0, 20) for _ in range(n)]
            assert selection_sort(list(arr)) == sorted(arr)
            cmp, swp = count_ops(arr)
            # 比较次数总是 n(n-1)/2，和数据无关；交换最多 n-1 次
            assert cmp == n * (n - 1) // 2
            assert swp <= max(n - 1, 0)
            for k in range(1, n + 1):
                assert kth_smallest(list(arr), k) == sorted(arr)[k - 1]

    # 已经有序：一次都不换
    assert count_ops(range(50)) == (50 * 49 // 2, 0)

    # 不稳定：两个 2 的先后顺序被换反了
    class Item:
        def __init__(self, v, tag):
            self.v, self.tag = v, tag

        def __lt__(self, other):
            return self.v < other.v

    out = selection_sort([Item(2, "a"), Item(2, "b"), Item(1, "c")])
    assert [x.tag for x in out] == ["c", "b", "a"]
    print("selection_sort: all tests passed")
