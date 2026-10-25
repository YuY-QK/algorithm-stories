package lru

// 参考答案。自己写完、测试通过以后再来对照。

class LRUCache(private val capacity: Int) {
    private class Node(val key: Int, var value: Int) {
        var prev: Node? = null
        var next: Node? = null
    }

    private val map = HashMap<Int, Node>()
    private val head = Node(0, 0) // 哨兵：head.next 是最久没用的
    private val tail = Node(0, 0) // 哨兵：tail.prev 是最近用过的

    init {
        head.next = tail
        tail.prev = head
    }

    private fun remove(n: Node) {
        n.prev!!.next = n.next
        n.next!!.prev = n.prev
    }

    private fun addLast(n: Node) {
        n.prev = tail.prev
        n.next = tail
        tail.prev!!.next = n
        tail.prev = n
    }

    private fun touch(n: Node) {
        remove(n)
        addLast(n)
    }

    fun get(key: Int): Int {
        val n = map[key] ?: return -1
        touch(n)
        return n.value
    }

    fun put(key: Int, value: Int) {
        val old = map[key]
        if (old != null) {
            old.value = value
            touch(old)
            return // 别忘了 return，否则会当成新 key 再插一次
        }
        if (map.size == capacity) {
            val eldest = head.next!!
            remove(eldest)
            map.remove(eldest.key) // 链表和哈希表要一起删
        }
        val n = Node(key, value)
        map[key] = n
        addLast(n)
    }
}

class LruMap<K, V>(private val capacity: Int) : LinkedHashMap<K, V>(16, 0.75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<K, V>): Boolean = size > capacity
}

fun lruHits(requests: IntArray, capacity: Int): Int {
    val cache = LRUCache(capacity)
    var hits = 0
    for (r in requests) {
        if (cache.get(r) != -1) hits++ else cache.put(r, r)
    }
    return hits
}
