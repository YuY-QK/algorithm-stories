package queue

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class RingQueueTest {
    private val rnd = Random(42)

    @Test
    fun `新建的队列是空的`() {
        val q = RingQueue(3)
        assertTrue(q.isEmpty())
        assertFalse(q.isFull())
        assertEquals(0, q.size)
        assertNull(q.peek(), "空队列 peek() 应该返回 null")
        assertNull(q.poll(), "空队列 poll() 应该返回 null")
    }

    @Test
    fun `容量必须大于 0`() {
        assertFailsWith<IllegalArgumentException> { RingQueue(0) }
    }

    @Test
    fun `先进先出`() {
        val q = RingQueue(5)
        for (x in listOf(10, 20, 30)) assertTrue(q.offer(x), "offer($x) 时没满，应该返回 true")
        assertEquals(10, q.peek(), "peek() 应该看到最早进来的 10")
        assertEquals(3, q.size, "peek() 不应该移除元素")
        assertEquals(10, q.poll())
        assertEquals(20, q.poll())
        assertEquals(30, q.poll())
        assertNull(q.poll(), "三个都出队以后应该是空的")
    }

    @Test
    fun `满了以后 offer 返回 false，队列不变`() {
        val q = RingQueue(3)
        q.offer(1); q.offer(2); q.offer(3)
        assertTrue(q.isFull())
        assertFalse(q.offer(4), "容量 3 已经放了 3 个，offer(4) 应该返回 false")
        assertEquals(3, q.size)
        assertEquals(1, q.poll(), "满了还 offer 不能把最早的 1 盖掉")
    }

    @Test
    fun `题目里的例子：绕回 0 号格`() {
        val q = RingQueue(3)
        q.offer(1); q.offer(2); q.offer(3)
        assertEquals(1, q.poll())
        assertTrue(q.offer(4), "出队空出了一格，offer(4) 应该成功（tail 要绕回 0）")
        assertEquals(listOf(2, 3, 4, null), List(4) { q.poll() })
    }

    @Test
    fun `满了以后不能被当成空的`() {
        val q = RingQueue(4)
        q.offer(1); q.poll()
        for (x in 2..5) q.offer(x)
        // 这时 head == tail，但队列是满的
        assertTrue(q.isFull(), "放了 4 个，容量 4，应该是满的")
        assertFalse(q.isEmpty(), "head == tail 不一定是空的")
        assertEquals(2, q.poll())
    }

    @Test
    fun `转很多圈也不会越界`() {
        val q = RingQueue(3)
        for (round in 0 until 100) {
            assertTrue(q.offer(round), "第 $round 次 offer：队里只有 ${q.size} 个，应该成功")
            assertEquals(round, q.poll())
        }
        assertTrue(q.isEmpty())
    }

    @Test
    fun `随机操作：和 ArrayDeque 的结果一样`() {
        repeat(500) {
            val cap = rnd.nextInt(1, 8)
            val q = RingQueue(cap)
            val ref = ArrayDeque<Int>()
            val log = mutableListOf<String>()
            repeat(rnd.nextInt(0, 60)) { k ->
                if (rnd.nextDouble() < 0.55) {
                    log += "offer($k)"
                    val ok = ref.size < cap
                    if (ok) ref.addLast(k)
                    assertEquals(ok, q.offer(k), "容量 $cap，操作 ${log.joinToString(" ")}")
                } else {
                    log += "poll()"
                    assertEquals(ref.removeFirstOrNull(), q.poll(), "容量 $cap，操作 ${log.joinToString(" ")}")
                }
                val ops = log.joinToString(" ")
                assertEquals(ref.size, q.size, "size 不对。容量 $cap，操作 $ops")
                assertEquals(ref.firstOrNull(), q.peek(), "peek() 不对。容量 $cap，操作 $ops")
                assertEquals(ref.isEmpty(), q.isEmpty(), "isEmpty() 不对。容量 $cap，操作 $ops")
                assertEquals(ref.size == cap, q.isFull(), "isFull() 不对。容量 $cap，操作 $ops")
            }
        }
    }
}
