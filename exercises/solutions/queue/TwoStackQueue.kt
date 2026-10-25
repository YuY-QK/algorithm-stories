package queue

// 参考答案。自己写完、测试通过以后再来对照。

class TwoStackQueue {
    private val inbox = ArrayDeque<Int>()
    private val outbox = ArrayDeque<Int>()

    fun offer(x: Int) {
        inbox.addLast(x)
    }

    /** outbox 空了才把 inbox 整个倒过去。每个元素最多进出两个栈各一次，所以平均 O(1)。 */
    private fun refill() {
        if (outbox.isEmpty()) {
            while (inbox.isNotEmpty()) outbox.addLast(inbox.removeLast())
        }
    }

    fun poll(): Int? {
        refill()
        return if (outbox.isEmpty()) null else outbox.removeLast()
    }

    fun peek(): Int? {
        refill()
        return if (outbox.isEmpty()) null else outbox.last()
    }

    val size: Int
        get() = inbox.size + outbox.size

    fun isEmpty(): Boolean = size == 0
}
