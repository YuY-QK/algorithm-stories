package lru

import org.junit.jupiter.api.Assertions.assertTimeoutPreemptively
import java.time.Duration
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals

/** 最笨的标准答案：用列表，最久没用的在最前面。慢，但一眼能看懂 */
private class NaiveLru(private val capacity: Int) {
    val items = ArrayList<Pair<Int, Int>>()

    fun get(key: Int): Int {
        val i = items.indexOfFirst { it.first == key }
        if (i < 0) return -1
        val p = items.removeAt(i)
        items.add(p)
        return p.second
    }

    fun put(key: Int, value: Int) {
        val i = items.indexOfFirst { it.first == key }
        if (i >= 0) items.removeAt(i) else if (items.size == capacity) items.removeAt(0)
        items.add(key to value)
    }
}

class LruTest {
    /* ---------- LRUCache ---------- */

    @Test
    fun `LRUCache：题目里的例子`() {
        val c = LRUCache(2)
        c.put(1, 1)
        c.put(2, 2)
        assertEquals(1, c.get(1), "get(1) 应该是 1")
        c.put(3, 3) // 淘汰 2
        assertEquals(-1, c.get(2), "put(3) 时 2 最久没用，应该被淘汰")
        c.put(4, 4) // 淘汰 1
        assertEquals(-1, c.get(1), "put(4) 时 1 最久没用，应该被淘汰")
        assertEquals(3, c.get(3))
        assertEquals(4, c.get(4))
    }

    @Test
    fun `LRUCache：get 命中也算用过`() {
        val c = LRUCache(2)
        c.put(1, 1)
        c.put(2, 2)
        c.get(1) // 1 刚用过，最久没用的变成 2
        c.put(3, 3)
        assertEquals(1, c.get(1), "get(1) 之后 1 是最近用过的，put(3) 不该淘汰它")
        assertEquals(-1, c.get(2), "该被淘汰的是 2")
    }

    @Test
    fun `LRUCache：put 已存在的 key 只更新，不淘汰，也算用过`() {
        val c = LRUCache(2)
        c.put(1, 1)
        c.put(2, 2)
        c.put(1, 10) // 满了，但 1 已存在：不能淘汰任何人
        assertEquals(10, c.get(1), "值应该更新成 10")
        assertEquals(2, c.get(2), "put 已存在的 key 不该淘汰 2")
        c.put(1, 11) // 现在最近用过的顺序是 ... 2, 1
        c.put(3, 3) // 淘汰 2
        assertEquals(-1, c.get(2), "put(1, 11) 之后 1 是最近用过的，该淘汰的是 2")
        assertEquals(11, c.get(1))
    }

    @Test
    fun `LRUCache：容量为 1`() {
        val c = LRUCache(1)
        c.put(1, 1)
        c.put(2, 2)
        assertEquals(-1, c.get(1), "容量 1，放入 2 就要淘汰 1")
        assertEquals(2, c.get(2))
        c.put(2, 3)
        assertEquals(3, c.get(2))
    }

    @Test
    fun `LRUCache：没放过的 key 返回 -1`() {
        val c = LRUCache(3)
        assertEquals(-1, c.get(7), "空缓存 get 应该返回 -1")
        c.put(7, 0)
        assertEquals(0, c.get(7), "值是 0 也要能取到，不能和 -1 混了")
    }

    @Test
    fun `LRUCache：和最笨的实现对拍`() {
        val rnd = Random(42)
        for (cap in listOf(1, 2, 3, 5, 8)) {
            repeat(200) {
                val mine = LRUCache(cap)
                val ref = NaiveLru(cap)
                val log = StringBuilder()
                repeat(60) {
                    val k = rnd.nextInt(10)
                    if (rnd.nextBoolean()) {
                        val v = rnd.nextInt(100)
                        log.append("put($k, $v) ")
                        mine.put(k, v)
                        ref.put(k, v)
                    } else {
                        log.append("get($k) ")
                        assertEquals(ref.get(k), mine.get(k), "容量 $cap，操作序列：$log")
                    }
                }
                // 最后把所有 key 都问一遍，看有没有幽灵或漏掉的
                for (k in 0 until 10) assertEquals(ref.get(k), mine.get(k), "最后 get($k)，容量 $cap，操作序列：$log")
            }
        }
    }

    @Test
    fun `LRUCache：十万次操作要在几秒内跑完（要求 O1）`() {
        assertTimeoutPreemptively(Duration.ofSeconds(5), {
            val n = 100_000
            val c = LRUCache(n)
            for (i in 0 until n) c.put(i, i * 2)
            var sum = 0L
            for (r in 0 until 3) for (i in 0 until n) sum += c.get(i)
            // 再放 n 个新的，把旧的全部挤走
            for (i in n until 2 * n) c.put(i, i)
            assertEquals(-1, c.get(0), "0 早就该被淘汰了")
            assertEquals(2L * n - 1, c.get(2 * n - 1).toLong())
            assertEquals(3L * 2 * n * (n - 1) / 2, sum)
        }, "get/put 应该是 O(1)，用列表一个个找会超时")
    }

    /* ---------- LruMap ---------- */

    @Test
    fun `LruMap：满了淘汰最久没用的`() {
        val m = LruMap<String, Int>(2)
        m["a"] = 1
        m["b"] = 2
        m["a"] // 访问 a，最久没用的变成 b
        m["c"] = 3
        assertEquals(listOf("a", "c"), m.keys.toList(), "b 应该被淘汰，顺序是最久到最近")
        assertEquals(2, m.size)
    }

    @Test
    fun `LruMap：和最笨的实现对拍`() {
        val rnd = Random(7)
        for (cap in listOf(1, 2, 4)) {
            val m = LruMap<Int, Int>(cap)
            val ref = NaiveLru(cap)
            repeat(2000) {
                val k = rnd.nextInt(8)
                if (rnd.nextBoolean()) {
                    m[k] = it
                    ref.put(k, it)
                } else {
                    assertEquals(ref.get(k), m[k] ?: -1, "容量 $cap，get($k)")
                }
                assertEquals(ref.items.map { p -> p.first }, m.keys.toList(), "容量 $cap，顺序对不上")
            }
        }
    }

    /* ---------- lruHits ---------- */

    @Test
    fun `lruHits：书桌上的例子`() {
        assertEquals(2, lruHits(intArrayOf(1, 2, 3, 4, 2, 5, 3, 1), 4), "借书 1 2 3 4 2 5 3 1，桌子放 4 本，命中 2 次")
    }

    @Test
    fun `lruHits：容量够大就是只有第一次会去书架`() {
        val r = intArrayOf(1, 2, 3, 1, 2, 3, 1, 2, 3)
        assertEquals(6, lruHits(r, 3), "3 本书、桌子放得下 3 本：只有前 3 次是缺失")
        assertEquals(0, lruHits(r, 2), "桌子只放 2 本，循环借 3 本，一次也命不中（LRU 的经典坏情况）")
    }

    @Test
    fun `lruHits：随机序列和最笨的实现对拍`() {
        val rnd = Random(3)
        repeat(300) {
            val cap = 1 + rnd.nextInt(5)
            val req = IntArray(1 + rnd.nextInt(40)) { rnd.nextInt(7) }
            val ref = NaiveLru(cap)
            var hits = 0
            for (r in req) {
                if (ref.get(r) != -1) hits++ else ref.put(r, r)
            }
            assertEquals(hits, lruHits(req, cap), "容量 $cap，请求 ${req.toList()}")
        }
    }
}
