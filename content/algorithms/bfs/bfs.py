"""广度优先搜索：小老鼠走迷宫。

迷宫是一组字符串：'#' 墙、'.' 空地、'S' 起点、'E' 终点。
"""
from collections import deque

DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]  # 上、下、左、右


def find_cell(grid, ch):
    for r, row in enumerate(grid):
        c = row.find(ch)
        if c >= 0:
            return r, c
    raise ValueError("迷宫里没有 " + ch)


def bfs_dist(grid):
    """从 S 出发，每个格子最少几步能到，走不到是 -1（按行展开成一维列表）。"""
    h, w = len(grid), len(grid[0])
    dist = [[-1] * w for _ in range(h)]
    sr, sc = find_cell(grid, "S")
    dist[sr][sc] = 0
    queue = deque([(sr, sc)])
    while queue:
        r, c = queue.popleft()
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < h and 0 <= nc < w and grid[nr][nc] != "#" and dist[nr][nc] == -1:
                dist[nr][nc] = dist[r][c] + 1  # 入队时就标记，同一格只进队一次
                queue.append((nr, nc))
    return [d for row in dist for d in row]


def shortest_path(grid):
    """S 到 E 最少几步，走不到返回 -1。"""
    er, ec = find_cell(grid, "E")
    return bfs_dist(grid)[er * len(grid[0]) + ec]


def _slow_dist(grid):
    """笨办法：反复松弛，直到没有格子能变得更近（Bellman-Ford），用来核对 BFS。"""
    h, w = len(grid), len(grid[0])
    inf = float("inf")
    d = [[inf] * w for _ in range(h)]
    sr, sc = find_cell(grid, "S")
    d[sr][sc] = 0
    changed = True
    while changed:
        changed = False
        for r in range(h):
            for c in range(w):
                if grid[r][c] == "#" or d[r][c] == inf:
                    continue
                for dr, dc in DIRS:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < h and 0 <= nc < w and grid[nr][nc] != "#" and d[r][c] + 1 < d[nr][nc]:
                        d[nr][nc] = d[r][c] + 1
                        changed = True
    return [-1 if x == inf else x for row in d for x in row]


if __name__ == "__main__":
    import random

    assert shortest_path(["SE"]) == 1
    assert shortest_path(["S#E"]) == -1
    assert shortest_path(["S..", "##.", "E.."]) == 6
    for _ in range(2000):
        h, w = random.randint(1, 8), random.randint(2, 8)
        cells = [["#" if random.random() < 0.3 else "." for _ in range(w)] for _ in range(h)]
        a, b = random.sample(range(h * w), 2)
        cells[a // w][a % w] = "S"
        cells[b // w][b % w] = "E"
        grid = ["".join(row) for row in cells]
        assert bfs_dist(grid) == _slow_dist(grid), grid
        assert shortest_path(grid) == _slow_dist(grid)[b], grid
    print("bfs: all tests passed")
