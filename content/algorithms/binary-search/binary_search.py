def binary_search(arr, target):
    """在有序数组 arr 中查找 target，返回下标；找不到返回 -1。"""
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2  # 不写 (lo + hi) // 2，避免其他语言里的整数溢出
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


if __name__ == "__main__":
    import random

    for n in (0, 1, 2, 7, 100):
        for _ in range(200):
            arr = sorted(random.sample(range(1000), n))
            for t in arr:
                assert arr[binary_search(arr, t)] == t
            assert binary_search(arr, -1) == -1
            assert binary_search(arr, 1000) == -1
    print("binary_search: all tests passed")
