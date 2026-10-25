def bubble_sort(a):
    """原地把列表 a 从小到大排好，返回 a。和网页上的 Kotlin 代码一行对一行。"""
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):  # 最后 i 个已经站好，不用再比；j + 1 最大到 n - 1 - i
            if a[j] > a[j + 1]:  # 用 > 不用 >=：相等不换，排序才稳定
                t = a[j]
                a[j] = a[j + 1]
                a[j + 1] = t
                swapped = True
        if not swapped:  # 一整轮都没换过，已经有序，提前结束
            break
    return a


def count_ops(a):
    """返回 (比较次数, 交换次数, 走了几轮)，不修改 a。"""
    a, n = list(a), len(a)
    cmp = swp = rounds = 0
    for i in range(n - 1):
        rounds += 1
        swapped = False
        for j in range(n - 1 - i):
            cmp += 1
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swp += 1
                swapped = True
        if not swapped:
            break
    return cmp, swp, rounds


def bubble_sort_by(items, key):
    """按 key 稳定排序，返回 (新列表, 交换次数)。Kotlin 练习里 bubbleSortWith 的 Python 版。"""
    a, n, swp = list(items), len(items), 0
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if key(a[j]) > key(a[j + 1]):
                a[j], a[j + 1] = a[j + 1], a[j]
                swp += 1
                swapped = True
        if not swapped:
            break
    return a, swp


def inversions(a):
    """逆序对个数：i < j 且 a[i] > a[j]。相邻交换排好最少要换这么多次。"""
    return sum(1 for i in range(len(a)) for j in range(i + 1, len(a)) if a[i] > a[j])


if __name__ == "__main__":
    import random

    for n in (0, 1, 2, 3, 7, 30):
        for _ in range(300):
            arr = [random.randint(0, 20) for _ in range(n)]
            assert bubble_sort(list(arr)) == sorted(arr)
            # 交换次数正好是逆序对个数
            assert count_ops(arr)[1] == inversions(arr)

    # 稳定性：值相同的元素保持原来的先后顺序
    pairs = [(random.randint(0, 5), k) for k in range(200)]
    out, _ = bubble_sort_by(pairs, key=lambda p: p[0])
    assert out == sorted(pairs, key=lambda p: p[0])

    # 故事里的队伍：小兔 120、小熊 145、小猫 118、小狗 132、小猴 138
    assert count_ops([120, 145, 118, 132, 138]) == (9, 4, 3)

    # 已有序只比较 n-1 次；逆序是最坏情况 n(n-1)/2 次比较和交换
    n = 50
    assert count_ops(range(n)) == (n - 1, 0, 1)
    assert count_ops(range(n, 0, -1))[:2] == (n * (n - 1) // 2, n * (n - 1) // 2)
    print("bubble_sort: all tests passed")
