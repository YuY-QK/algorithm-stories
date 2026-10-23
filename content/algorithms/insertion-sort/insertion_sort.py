def insertion_sort(arr):
    """把 arr 原地排成升序，返回 (比较次数, 挪动次数)。

    比较次数数的是 arr[j] > key 实际算了几次（j >= 0 不成立时不算），
    挪动次数数的是 arr[j + 1] = arr[j] 执行了几次。
    """
    compares = moves = 0
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0:
            compares += 1
            if not arr[j] > key:  # 相等时不挪，保持稳定
                break
            arr[j + 1] = arr[j]
            moves += 1
            j -= 1
        arr[j + 1] = key
    return compares, moves


def inversions(arr):
    """逆序对数：前面比后面大的一对算一个。"""
    return sum(1 for x in range(len(arr)) for y in range(x + 1, len(arr)) if arr[x] > arr[y])


if __name__ == "__main__":
    import random

    for n in (0, 1, 2, 5, 30):
        for _ in range(300):
            a = [random.randint(1, 6) for _ in range(n)]
            b = list(a)
            compares, moves = insertion_sort(b)
            assert b == sorted(a)
            assert moves == inversions(a)
            if n > 1:
                assert n - 1 <= compares <= n * (n - 1) // 2
    # 稳定：用 (点数, 原来的位置) 排，只比点数，排完相等的牌位置仍然递增
    cards = [(3, 0), (1, 1), (3, 2), (2, 3)]

    class Card:
        def __init__(self, v, at):
            self.v, self.at = v, at

        def __gt__(self, other):
            return self.v > other.v

    hand = [Card(v, at) for v, at in cards]
    insertion_sort(hand)
    assert [(c.v, c.at) for c in hand] == [(1, 1), (2, 3), (3, 0), (3, 2)]
    assert insertion_sort([4, 2, 5, 1, 3]) == (8, 6)
    print("insertion_sort: all tests passed")
