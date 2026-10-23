package queue

// 参考答案。自己写完、测试通过以后再来对照。

class RingQueue(capacity: Int) {
    init {
        require(capacity > 0) { "容量必须大于 0" }
    }

    private val items = IntArray(capacity)
    private var head = 0 // 下一个出队的格子
    private var tail = 0 // 下一个入队的格子
    private var count = 0 // 用人数区分空和满：head == tail 时，count 是 0 就是空，是容量就是满

    fun offer(x: Int): Boolean {
        if (isFull()) return false
        items[tail] = x
        tail = (tail + 1) % items.size
        count++
        return true
    }

    fun poll(): Int? {
        if (isEmpty()) return null
        val x = items[head]
        head = (head + 1) % items.size
        count--
        return x
    }

    fun peek(): Int? = if (isEmpty()) null else items[head]

    val size: Int
        get() = count

    fun isEmpty(): Boolean = count == 0

    fun isFull(): Boolean = count == items.size
}
