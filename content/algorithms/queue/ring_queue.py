class RingQueue:
    """循环队列：固定容量的数组，head 指向下一个出队的格子，tail 指向下一个入队的格子。"""

    def __init__(self, capacity):
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.items = [None] * capacity  # None 表示这一格从来没写过
        self.head = 0
        self.tail = 0
        self.size = 0

    def offer(self, x):
        """入队。满了返回 False。"""
        if self.size == len(self.items):
            return False
        self.items[self.tail] = x
        self.tail = (self.tail + 1) % len(self.items)  # 走到末尾绕回 0
        self.size += 1
        return True

    def poll(self):
        """出队。空的返回 None。出队的值不擦掉，只是 head 走过去了。"""
        if self.size == 0:
            return None
        x = self.items[self.head]
        self.head = (self.head + 1) % len(self.items)
        self.size -= 1
        return x

    def peek(self):
        return None if self.size == 0 else self.items[self.head]

    def is_empty(self):
        return self.size == 0

    def is_full(self):
        return self.size == len(self.items)


def run(capacity, ops):
    """按 ops 执行，ops 里每项是 {"kind": "offer", "x": n} 或 {"kind": "poll"}。返回每个操作的返回值和最后的状态。"""
    q = RingQueue(capacity)
    results = [q.offer(op["x"]) if op["kind"] == "offer" else q.poll() for op in ops]
    return {"results": results, "cells": q.items, "head": q.head, "tail": q.tail, "size": q.size}


if __name__ == "__main__":
    import random
    from collections import deque

    for _ in range(3000):
        cap = random.randint(1, 7)
        q, ref = RingQueue(cap), deque()
        for step in range(random.randint(0, 40)):
            if random.random() < 0.55:
                ok = q.offer(step)
                assert ok == (len(ref) < cap)
                if ok:
                    ref.append(step)
            else:
                assert q.poll() == (ref.popleft() if ref else None)
            assert q.size == len(ref)
            assert q.peek() == (ref[0] if ref else None)
            assert q.is_empty() == (not ref) and q.is_full() == (len(ref) == cap)
            assert q.tail == (q.head + q.size) % cap
    print("ring_queue: all tests passed")
