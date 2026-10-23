package queue

/**
 * 变种：只用两个栈实现一个队列（没有容量限制）。
 *
 * 栈是后进先出，两个栈却能拼出先进先出：一个栈负责进（inbox），一个栈负责出（outbox）。
 * 出的那个栈空了，就把进的那个栈整个倒过去，顺序正好翻过来。
 *
 * 规则：两个栈各用一个 ArrayDeque<Int>，只许用 addLast（压栈）、removeLast（弹栈）、
 * last()（看栈顶）、isEmpty()、size 这几个操作，把它们当成真正的栈。
 *
 * 例子：
 *   offer(1) offer(2) → poll() 返回 1 → offer(3) → poll() 返回 2 → poll() 返回 3 → poll() 返回 null
 *
 * 想一想：一个元素最多被倒几次？为什么说每个操作「平均」是 O(1)？
 */
class TwoStackQueue {
    private val inbox = ArrayDeque<Int>()
    private val outbox = ArrayDeque<Int>()

    /** 入队，永远成功。 */
    fun offer(x: Int) {
        TODO("写 offer")
    }

    /** 出队。空的返回 null。 */
    fun poll(): Int? {
        TODO("写 poll")
    }

    /** 看一眼队头，不移除。空的返回 null。 */
    fun peek(): Int? {
        TODO("写 peek")
    }

    val size: Int
        get() = TODO("写 size")

    fun isEmpty(): Boolean {
        TODO("写 isEmpty")
    }
}
