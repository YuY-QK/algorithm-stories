class _Node:
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    """哈希表 + 双向链表。head.next 是最久没用的，tail.prev 是最近用过的。get/put 都是 O(1)。"""

    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}
        self.head = _Node()
        self.tail = _Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, n):
        n.prev.next = n.next
        n.next.prev = n.prev

    def _add_last(self, n):
        n.prev = self.tail.prev
        n.next = self.tail
        self.tail.prev.next = n
        self.tail.prev = n

    def _touch(self, n):
        self._remove(n)
        self._add_last(n)

    def get(self, key):
        n = self.map.get(key)
        if n is None:
            return -1
        self._touch(n)
        return n.value

    def put(self, key, value):
        old = self.map.get(key)
        if old is not None:
            old.value = value
            self._touch(old)
            return
        if len(self.map) == self.capacity:
            eldest = self.head.next
            self._remove(eldest)
            del self.map[eldest.key]
        n = _Node(key, value)
        self.map[key] = n
        self._add_last(n)

    def order(self):
        """从最久没用到最近用过的 key 列表"""
        out = []
        n = self.head.next
        while n is not self.tail:
            out.append(n.key)
            n = n.next
        return out


def run_ops(capacity, ops):
    """ops 里每项是 ["put", k, v] 或 ["get", k]。返回 [每次 get 的结果（put 记 None）, 最后的顺序]。"""
    c = LRUCache(capacity)
    res = []
    for op in ops:
        if op[0] == "put":
            c.put(op[1], op[2])
            res.append(None)
        else:
            res.append(c.get(op[1]))
    return [res, c.order()]


def hits(seq, capacity, policy):
    """访问序列 seq 在容量 capacity 下的命中次数。policy 是 "lru" 或 "fifo"。"""
    desk = []
    count = 0
    for x in seq:
        if x in desk:
            count += 1
            if policy == "lru":
                desk.remove(x)
                desk.append(x)
        else:
            if len(desk) == capacity:
                desk.pop(0)
            desk.append(x)
    return count


if __name__ == "__main__":
    import random

    c = LRUCache(2)
    c.put(1, 1)
    c.put(2, 2)
    assert c.get(1) == 1
    c.put(3, 3)  # 淘汰 2
    assert c.get(2) == -1
    c.put(4, 4)  # 淘汰 1
    assert c.get(1) == -1 and c.get(3) == 3 and c.get(4) == 4

    # 和最笨的列表实现对拍
    for cap in (1, 2, 3, 5):
        for _ in range(200):
            c = LRUCache(cap)
            ref = []  # [(k, v)]，最久在前
            for _ in range(60):
                k = random.randrange(8)
                if random.random() < 0.5:
                    v = random.randrange(100)
                    c.put(k, v)
                    ref = [p for p in ref if p[0] != k]
                    if len(ref) == cap:
                        ref.pop(0)
                    ref.append((k, v))
                else:
                    got = c.get(k)
                    hit = [p for p in ref if p[0] == k]
                    assert got == (hit[0][1] if hit else -1)
                    if hit:
                        ref = [p for p in ref if p[0] != k] + hit
                assert c.order() == [p[0] for p in ref]
                assert len(c.map) == len(ref) <= cap

    # 命中次数：Belady 的经典序列
    s = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
    assert len(s) - hits(s, 3, "fifo") == 9
    assert len(s) - hits(s, 4, "fifo") == 10
    assert hits([1, 2, 3, 4, 2, 5, 3, 1], 4, "lru") == 2
    print("lru_cache: all tests passed")
