package queue

/*
 * 关卡：队列「奶茶店排队」
 *
 * 把这个文件和 TwoStackQueue.kt 里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'queue.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 */

/**
 * 循环队列：容量固定为 [capacity]，用一个 IntArray 存元素，不许用标准库的队列和列表。
 * 先进先出：先 offer 进来的先被 poll 出去。
 *
 * 例子：容量 3
 *   offer(1) offer(2) offer(3)  → 都返回 true，队列满了
 *   offer(4)                    → false，满了放不下
 *   poll()                      → 1
 *   offer(4)                    → true，4 写进刚空出来的 0 号格（绕回去了）
 *   poll() poll() poll() poll() → 2、3、4、null
 *
 * 提示：
 * - 记住 head（下一个出队的格子）、tail（下一个入队的格子），走到数组末尾要绕回 0。
 * - head == tail 时，队列可能是空的，也可能是满的。想清楚你用什么区分它们。
 * - 每个操作都应该是 O(1)：不要挪动数组里的元素。
 */
class RingQueue(capacity: Int) {
    init {
        require(capacity > 0) { "容量必须大于 0" }
    }

    // 在这里放你需要的字段

    /** 入队。满了返回 false，队列不变；否则放到队尾，返回 true。 */
    fun offer(x: Int): Boolean {
        TODO("写 offer")
    }

    /** 出队。空的返回 null；否则返回并移除队头。 */
    fun poll(): Int? {
        TODO("写 poll")
    }

    /** 看一眼队头，不移除。空的返回 null。 */
    fun peek(): Int? {
        TODO("写 peek")
    }

    /** 队里现在有几个元素。 */
    val size: Int
        get() = TODO("写 size")

    fun isEmpty(): Boolean {
        TODO("写 isEmpty")
    }

    fun isFull(): Boolean {
        TODO("写 isFull")
    }
}
