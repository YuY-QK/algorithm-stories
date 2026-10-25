"""深度优先搜索：探险家走山洞。

山洞是一组字符串：'#' 岩石、'.' 空地、'S' 起点、'E' 终点。
海图是一组字符串：'1' 陆地、'0' 海。
方向顺序固定：上、右、下、左。
"""
import sys

sys.setrecursionlimit(10000)

DIRS = [(-1, 0), (0, 1), (1, 0), (0, -1)]  # 上、右、下、左


def find_cell(grid, ch):
    for r, row in enumerate(grid):
        c = row.find(ch)
        if c >= 0:
            return r, c
    raise ValueError("山洞里没有 " + ch)


def dfs_order(grid):
    """从 S 出发，按「第一次标记 visited」的先后排格子（id = r * w + c），碰到 E 就停（E 包括在内）。"""
    h, w = len(grid), len(grid[0])
    visited = [[False] * w for _ in range(h)]
    order = []
    found = []

    def dfs(r, c):
        if not (0 <= r < h and 0 <= c < w):
            return False
        if grid[r][c] == "#" or visited[r][c]:
            return False
        visited[r][c] = True
        order.append(r * w + c)
        if grid[r][c] == "E":
            found.append(True)
            return True
        for dr, dc in DIRS:
            if dfs(r + dr, c + dc):
                return True
        return False

    sr, sc = find_cell(grid, "S")
    dfs(sr, sc)
    return order


def has_path(grid):
    """S 能不能走到 E。"""
    h, w = len(grid), len(grid[0])
    er, ec = find_cell(grid, "E")
    return (er * w + ec) in dfs_order(grid)


def num_islands(grid):
    """数岛屿：上下左右连着的 '1' 算一座。洪水填充。"""
    h, w = len(grid), len(grid[0])
    seen = [[False] * w for _ in range(h)]

    def fill(r, c):
        if not (0 <= r < h and 0 <= c < w) or grid[r][c] != "1" or seen[r][c]:
            return
        seen[r][c] = True
        for dr, dc in DIRS:
            fill(r + dr, c + dc)

    count = 0
    for r in range(h):
        for c in range(w):
            if grid[r][c] == "1" and not seen[r][c]:
                count += 1
                fill(r, c)
    return count


def count_paths(grid):
    """S 到 E 有几条不重复走格子的路（回溯：退出时擦掉标记）。"""
    h, w = len(grid), len(grid[0])
    visited = [[False] * w for _ in range(h)]

    def go(r, c):
        if not (0 <= r < h and 0 <= c < w) or grid[r][c] == "#" or visited[r][c]:
            return 0
        if grid[r][c] == "E":
            return 1
        visited[r][c] = True
        total = sum(go(r + dr, c + dc) for dr, dc in DIRS)
        visited[r][c] = False  # 回溯
        return total

    sr, sc = find_cell(grid, "S")
    return go(sr, sc)


def _slow_islands(grid):
    """笨办法：并查集，用来核对 num_islands。"""
    h, w = len(grid), len(grid[0])
    parent = list(range(h * w))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for r in range(h):
        for c in range(w):
            if grid[r][c] != "1":
                continue
            for dr, dc in ((0, 1), (1, 0)):
                nr, nc = r + dr, c + dc
                if nr < h and nc < w and grid[nr][nc] == "1":
                    parent[find(r * w + c)] = find(nr * w + nc)
    return len({find(r * w + c) for r in range(h) for c in range(w) if grid[r][c] == "1"})


def _slow_reach(grid):
    """笨办法：反复扩张，直到不再变化，用来核对 has_path。"""
    h, w = len(grid), len(grid[0])
    sr, sc = find_cell(grid, "S")
    got = {(sr, sc)}
    changed = True
    while changed:
        changed = False
        for r, c in list(got):
            for dr, dc in DIRS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w and grid[nr][nc] != "#" and (nr, nc) not in got:
                    got.add((nr, nc))
                    changed = True
    er, ec = find_cell(grid, "E")
    return (er, ec) in got


if __name__ == "__main__":
    import random

    assert num_islands(["110", "110", "001"]) == 2
    assert num_islands(["000"]) == 0
    assert has_path(["S.E"]) is True
    assert has_path(["S#E"]) is False
    assert count_paths(["S.", ".E"]) == 2
    assert count_paths(["S#E"]) == 0
    for _ in range(2000):
        h, w = random.randint(1, 7), random.randint(2, 7)
        cells = [["#" if random.random() < 0.3 else "." for _ in range(w)] for _ in range(h)]
        a, b = random.sample(range(h * w), 2)
        cells[a // w][a % w] = "S"
        cells[b // w][b % w] = "E"
        grid = ["".join(row) for row in cells]
        assert has_path(grid) == _slow_reach(grid), grid
        isl = ["".join("1" if random.random() < 0.5 else "0" for _ in range(w)) for _ in range(h)]
        assert num_islands(isl) == _slow_islands(isl), isl
        assert (count_paths(grid) > 0) == has_path(grid), grid
    print("dfs: all tests passed")
