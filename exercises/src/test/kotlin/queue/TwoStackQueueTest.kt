package queue

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TwoStackQueueTest {
    private val rnd = Random(7)

    @Test
    fun `空队列`() {
        val q = TwoStackQueue()
        assertTrue(q.isEmpty())
        assertEquals(0, q.size)
        assertNull(q.peek())
        assertNull(q.poll())
    }

    @Test
    fun `题目里的例子`() {
        val q = TwoStackQueue()
        q.offer(1); q.offer(2)
        assertEquals(1, q.poll(), "先进来的 1 应该先出去")
        q.offer(3)
        assertEquals(2, q.poll(), "倒过一次以后又来了 3，下一个还应该是 2")
        assertEquals(3, q.poll())
        assertNull(q.poll())
    }

    @Test
    fun `进进出出交替`() {
        val q = TwoStackQueue()
        for (x in 1..3) q.offer(x)
        assertEquals(1, q.peek(), "peek() 应该看到 1")
        assertEquals(3, q.size, "peek() 不应该移除元素")
        assertEquals(1, q.poll())
        for (x in 4..5) q.offer(x)
        assertEquals(listOf(2, 3, 4, 5), List(4) { q.poll() })
    }

    @Test
    fun `随机操作：和 ArrayDeque 的结果一样`() {
        repeat(500) {
            val q = TwoStackQueue()
            val ref = ArrayDeque<Int>()
            val log = mutableListOf<String>()
            repeat(rnd.nextInt(0, 80)) { k ->
                if (rnd.nextDouble() < 0.55) {
                    log += "offer($k)"
                    q.offer(k)
                    ref.addLast(k)
                } else {
                    log += "poll()"
                    assertEquals(ref.removeFirstOrNull(), q.poll(), "操作 ${log.joinToString(" ")}")
                }
                val ops = log.joinToString(" ")
                assertEquals(ref.size, q.size, "size 不对。操作 $ops")
                assertEquals(ref.firstOrNull(), q.peek(), "peek() 不对。操作 $ops")
                assertEquals(ref.isEmpty(), q.isEmpty(), "isEmpty() 不对。操作 $ops")
            }
        }
    }
}
