package hashlookup

// 参考答案。自己写完、测试通过以后再来对照。

class ChainedIntMap(private val capacity: Int = 7) {
    private class Node(val key: Int, var value: Int)

    private val buckets = Array(capacity) { mutableListOf<Node>() }

    var size: Int = 0
        private set

    fun bucketOf(key: Int): Int = Math.floorMod(key, capacity) // 负数键也落在 0 until capacity

    fun put(key: Int, value: Int) {
        val chain = buckets[bucketOf(key)]
        val node = chain.firstOrNull { it.key == key }
        if (node != null) {
            node.value = value // 已存在：更新，不重复挂
        } else {
            chain.add(Node(key, value))
            size++
        }
    }

    fun get(key: Int): Int? = buckets[bucketOf(key)].firstOrNull { it.key == key }?.value

    fun remove(key: Int): Boolean {
        val removed = buckets[bucketOf(key)].removeAll { it.key == key }
        if (removed) size--
        return removed
    }
}

class ProbedIntMap(private val capacity: Int = 7) {
    private val keys = IntArray(capacity)
    private val values = IntArray(capacity)
    private val state = ByteArray(capacity) // 0 空桶，1 有键，2 墓碑

    /** 从键的桶开始往后找，返回键所在的桶；没有返回 -1。碰到空桶停，墓碑跳过，最多看 capacity 个桶。 */
    private fun find(key: Int): Int {
        var i = Math.floorMod(key, capacity)
        repeat(capacity) {
            if (state[i].toInt() == 0) return -1
            if (state[i].toInt() == 1 && keys[i] == key) return i
            i = (i + 1) % capacity // 回绕
        }
        return -1
    }

    fun put(key: Int, value: Int): Boolean {
        val at = find(key)
        if (at >= 0) {
            values[at] = value
            return true
        }
        var i = Math.floorMod(key, capacity)
        repeat(capacity) {
            if (state[i].toInt() != 1) { // 空桶或墓碑，都能放
                keys[i] = key
                values[i] = value
                state[i] = 1
                return true
            }
            i = (i + 1) % capacity
        }
        return false
    }

    fun get(key: Int): Int? {
        val at = find(key)
        return if (at >= 0) values[at] else null
    }

    fun remove(key: Int): Boolean {
        val at = find(key)
        if (at < 0) return false
        state[at] = 2 // 墓碑，不是空桶
        return true
    }
}
