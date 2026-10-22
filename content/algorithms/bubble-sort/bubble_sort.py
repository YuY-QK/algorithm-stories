def bubble_sort(a):
    """原地把列表 a 从小到大排好，返回 a。相邻两个比一比，大的往后换。"""
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):  # 最后 i 个已经排好，不用再比
            if a[j] > a[j + 1]:  # 用 > 而不是 >=，相等不换，排序才稳定
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:  # 一整轮都没换过，说明已经有序，提前结束
            break
    return a


def count_ops(a):
    """返回 (比较次数, 交换次数)，不修改 a。"""
    a, n, cmp, swp = list(a), len(a), 0, 0
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            cmp += 1
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swp += 1
                swapped = True
        if not swapped:
            break
    return cmp, swp


if __name__ == "__main__":
    import random

    for n in (0, 1, 2, 3, 7, 30):
        for _ in range(300):
            arr = [random.randint(0, 20) for _ in range(n)]
            assert bubble_sort(list(arr)) == sorted(arr)

    # 稳定性：值相同的元素保持原来的先后顺序
    pairs = [(random.randint(0, 5), k) for k in range(200)]

    class Item:
        def __init__(self, p): self.p = p
        def __gt__(self, other): return self.p[0] > other.p[0]

    out = [x.p for x in bubble_sort([Item(p) for p in pairs])]
    assert out == sorted(pairs, key=lambda p: p[0])

    # 已有序只比较 n-1 次；逆序是最坏情况 n(n-1)/2 次比较和交换
    n = 50
    assert count_ops(range(n)) == (n - 1, 0)
    assert count_ops(range(n, 0, -1)) == (n * (n - 1) // 2, n * (n - 1) // 2)
    print("bubble_sort: all tests passed")
