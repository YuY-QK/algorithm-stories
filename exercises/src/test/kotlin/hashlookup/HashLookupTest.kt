package hashlookup

import org.junit.jupiter.api.Assertions.assertTimeoutPreemptively
import org.junit.jupiter.api.function.ThrowingSupplier
import java.time.Duration
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class HashLookupTest {
    // ---------- 链地址法 ----------

    @Test
    fun `桶号：bucketOf(15) 是 1，负数键也在范围内`() {
        val m = ChainedIntMap(7)
        assertEquals(1, m.bucketOf(15), "容量 7，bucketOf(15)")
        assertEquals(4, m.bucketOf(-3), "容量 7，bucketOf(-3)，Kotlin 里 -3 % 7 是 -3，要想办法落到 0 到 6")
        assertEquals(0, m.bucketOf(-7), "容量 7，bucketOf(-7)")
        for (k in -50..50) assertTrue(m.bucketOf(k) in 0 until 7, "bucketOf($k) = ${m.bucketOf(k)}，不在 0 until 7 里")
    }

    @Test
    fun `放进去能取出来，取不存在的键得到 null`() {
        val m = ChainedIntMap()
        m.put(10, 100)
        m.put(23, 230)
        assertEquals(100, m.get(10))
        assertEquals(230, m.get(23))
        assertNull(m.get(17), "get(17)，表里没有 17")
        assertEquals(2, m.size)
    }

    @Test
    fun `键已存在时 put 是更新，size 不变`() {
        val m = ChainedIntMap()
        m.put(5, 1)
        m.put(5, 2)
        assertEquals(2, m.get(5), "put(5, 1) 再 put(5, 2)，get(5) 应该是 2")
        assertEquals(1, m.size, "同一个键放两次，size 应该还是 1")
    }

    @Test
    fun `链地址法：同一个桶的 1、8、15 都能取到，删掉 8 后 1 和 15 还在`() {
        val m = ChainedIntMap(7)
        for (k in listOf(1, 8, 15)) m.put(k, k * 10)
        for (k in listOf(1, 8, 15)) assertEquals(k * 10, m.get(k), "get($k)")
        assertTrue(m.remove(8), "remove(8)")
        assertNull(m.get(8), "删掉后 get(8)")
        assertEquals(10, m.get(1), "删掉 8 后 get(1)")
        assertEquals(150, m.get(15), "删掉 8 后 get(15)")
        assertEquals(2, m.size)
    }

    @Test
    fun `链地址法：remove 不存在的键返回 false`() {
        val m = ChainedIntMap()
        m.put(1, 1)
        assertFalse(m.remove(2), "remove(2)，表里没有 2")
        assertEquals(1, m.size)
    }

    @Test
    fun `链地址法：负数键能放能取`() {
        val m = ChainedIntMap(7)
        m.put(-3, 33)
        m.put(4, 44) // 和 -3 同桶
        assertEquals(33, m.get(-3), "get(-3)")
        assertEquals(44, m.get(4), "get(4)")
    }

    @Test
    fun `链地址法：随机操作和 HashMap 对拍`() {
        val rnd = Random(7)
        repeat(50) {
            val cap = rnd.nextInt(1, 12)
            val mine = ChainedIntMap(cap)
            val ref = HashMap<Int, Int>()
            val log = mutableListOf<String>()
            repeat(300) {
                val k = rnd.nextInt(-30, 30)
                when (rnd.nextInt(3)) {
                    0 -> { val v = rnd.nextInt(1000); log += "put($k, $v)"; mine.put(k, v); ref[k] = v }
                    1 -> { log += "remove($k)"; assertEquals(ref.remove(k) != null, mine.remove(k), "容量 $cap，${log.takeLast(5)} 之后 remove($k)") }
                    else -> { log += "get($k)"; assertEquals(ref[k], mine.get(k), "容量 $cap，${log.takeLast(5)} 之后 get($k)") }
                }
                assertEquals(ref.size, mine.size, "容量 $cap，${log.takeLast(5)} 之后 size")
            }
        }
    }

    // ---------- 线性探测 ----------

    @Test
    fun `线性探测：1、8、15 同桶，三个都能取到`() {
        val m = ProbedIntMap(7)
        for (k in listOf(1, 8, 15)) assertTrue(m.put(k, k * 10), "put($k)")
        for (k in listOf(1, 8, 15)) assertEquals(k * 10, m.get(k), "get($k)")
    }

    @Test
    fun `线性探测：往后走到头要回绕到 0 号`() {
        val m = ProbedIntMap(7)
        assertTrue(m.put(6, 60))
        assertTrue(m.put(13, 130), "13 的目标桶是 6 号，被 6 占了，要回绕到 0 号桶")
        assertTrue(m.put(20, 200), "20 的目标桶是 6 号，6、0 号都被占了，要放到 1 号桶")
        assertEquals(130, m.get(13), "get(13)")
        assertEquals(200, m.get(20), "get(20)")
    }

    @Test
    fun `线性探测：键已存在时 put 是更新`() {
        val m = ProbedIntMap(7)
        m.put(1, 10)
        m.put(8, 80)
        assertTrue(m.put(8, 81))
        assertEquals(81, m.get(8), "put(8, 80) 再 put(8, 81)，get(8) 应该是 81")
        assertEquals(10, m.get(1))
    }

    @Test
    fun `线性探测：删掉 1 之后，排在它后面的 8 仍能取到（墓碑）`() {
        val m = ProbedIntMap(7)
        m.put(1, 10)
        m.put(8, 80)
        m.put(15, 150)
        assertTrue(m.remove(1), "remove(1)")
        assertEquals(80, m.get(8), "先放 1、8、15，删掉 1，get(8)：8 在 1 号桶后面，不能因为 1 号桶清空就断链")
        assertEquals(150, m.get(15), "删掉 1 之后 get(15)")
        assertNull(m.get(1), "删掉后 get(1)")
    }

    @Test
    fun `线性探测：删除后再插入可以复用墓碑，取值仍然正确`() {
        val m = ProbedIntMap(7)
        m.put(1, 10)
        m.put(8, 80)
        m.remove(1)
        assertTrue(m.put(22, 220), "22 的目标桶是 1 号，可以放进墓碑位置")
        assertEquals(220, m.get(22), "get(22)")
        assertEquals(80, m.get(8), "get(8)")
        assertTrue(m.put(8, 81), "put(8, 81)")
        assertEquals(81, m.get(8), "8 已经在表里，更新，不能在墓碑位置再放一份旧的")
        assertTrue(m.remove(8), "remove(8)")
        assertNull(m.get(8), "删掉 8 之后 get(8) 应该是 null，不能还有第二份")
    }

    @Test
    fun `线性探测：remove 不存在的键返回 false`() {
        val m = ProbedIntMap(7)
        m.put(1, 10)
        assertFalse(m.remove(2), "remove(2)")
        assertFalse(m.remove(8), "remove(8)，8 的目标桶 1 号有 1，但不是 8")
    }

    @Test
    fun `线性探测：容量 3 放满后再放新键返回 false，查不存在的键不死循环`() {
        val m = ProbedIntMap(3)
        assertTrue(m.put(0, 0))
        assertTrue(m.put(1, 1))
        assertTrue(m.put(2, 2))
        assertFalse(m.put(9, 9), "表满了，put(9) 应该返回 false")
        val found = assertTimeoutPreemptively(
            Duration.ofSeconds(2),
            ThrowingSupplier<Int?> { m.get(9) },
            "满表里 get(9) 超过 2 秒没返回，多半死循环了：一个空桶也没有，看过 3 个桶就该停",
        )
        assertNull(found, "满表里 get(9)，一个空桶也没有，看过 3 个桶就该停")
        assertEquals(2, m.get(2))
        assertTrue(m.put(2, 22), "满表里更新已有的键是可以的")
        assertEquals(22, m.get(2))
    }

    @Test
    fun `线性探测：负数键`() {
        val m = ProbedIntMap(7)
        assertTrue(m.put(-3, 33), "put(-3)，不能越界")
        assertTrue(m.put(4, 44), "4 和 -3 同桶")
        assertEquals(33, m.get(-3))
        assertEquals(44, m.get(4))
    }

    @Test
    fun `线性探测：随机操作和 HashMap 对拍`() {
        val rnd = Random(11)
        repeat(100) {
            val cap = rnd.nextInt(2, 10)
            val mine = ProbedIntMap(cap)
            val ref = HashMap<Int, Int>()
            val log = mutableListOf<String>()
            repeat(300) {
                val k = rnd.nextInt(-15, 15)
                when (rnd.nextInt(3)) {
                    0 -> {
                        val v = rnd.nextInt(1000)
                        val ok = mine.put(k, v)
                        log += "put($k, $v)=$ok"
                        if (ok) ref[k] = v
                        else assertTrue(ref.size >= cap && k !in ref, "容量 $cap，${log.takeLast(5)}：put 失败了，可表里还有空位或墓碑可用")
                    }
                    1 -> { log += "remove($k)"; assertEquals(ref.remove(k) != null, mine.remove(k), "容量 $cap，${log.takeLast(5)}") }
                    else -> { log += "get($k)"; assertEquals(ref[k], mine.get(k), "容量 $cap，${log.takeLast(5)}") }
                }
            }
            for ((k, v) in ref) assertEquals(v, mine.get(k), "容量 $cap，最后 get($k)")
        }
    }
}
