package lru

/*
 * 关卡：LRU 缓存「书桌上的五本书」
 *
 * 把下面三处 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'lru.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 */

/**
 * 第一关：自己写 LRU 缓存。容量 [capacity]（至少为 1）满了以后，淘汰「最久没被用过」的那个。
 *
 * - get(key)：有就返回值，并且算「刚用过」；没有返回 -1。
 * - put(key, value)：key 已经在里面，就更新值，也算「刚用过」，不淘汰任何人；
 *   key 是新的，先看满没满，满了淘汰最久没用的，再放进去。
 *
 * 要求：get 和 put 都是 O(1)。测试会放大数据量，用列表一个个找会超时。
 * 提示：哈希表（HashMap）负责 O(1) 找到节点，自己写的双向链表负责记住「谁最久没用」。
 * 用头尾两个哨兵节点，链表空不空都不用特判。这一关不要用 LinkedHashMap，那是第二关。
 *
 * 例子（容量 2）：
 *   put(1, 1) put(2, 2) get(1) = 1
 *   put(3, 3)  // 淘汰 2
 *   get(2) = -1   put(4, 4)  // 淘汰 1
 *   get(1) = -1   get(3) = 3   get(4) = 4
 */
class LRUCache(private val capacity: Int) {
    fun get(key: Int): Int {
        TODO("命中就挪到最近用过的位置并返回值，没有返回 -1")
    }

    fun put(key: Int, value: Int) {
        TODO("已存在就更新并挪位置；否则满了先淘汰最久没用的，再放进去")
    }
}

/**
 * 第二关：同一件事，让标准库帮你维护顺序。
 *
 * LinkedHashMap 的第三个构造参数 accessOrder = true 表示「按访问顺序排列」：
 * 每次 get 或 put 一个 key，它就被挪到最后；迭代时最前面的是最久没用的。
 * 满了该不该删最前面那个，由 [removeEldestEntry] 决定：返回 true，就把 eldest 删掉。
 *
 * 只需要写 [removeEldestEntry] 这一个函数。注意它是在 put 放进新元素之后才被调用的。
 *
 * 例子（capacity = 2）：put("a", 1) put("b", 2) get("a") put("c", 3) → keys 是 [a, c]，"b" 被淘汰
 */
class LruMap<K, V>(private val capacity: Int) : LinkedHashMap<K, V>(16, 0.75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<K, V>): Boolean {
        TODO("size 超过 capacity 就返回 true")
    }
}

/**
 * 第三关：数命中次数。[requests] 是一串要借的书（书的编号），书桌容量 [capacity]，
 * 返回用 LRU 策略一共命中了几次（要的书正好在桌上）。
 *
 * 例子：requests = [1, 2, 3, 4, 2, 5, 3, 1]，capacity = 4 → 命中 2 次（第 5 次借 2，第 7 次借 3）
 *
 * 提示：可以直接用上面写好的 LRUCache：get 不是 -1 就是命中，否则 put 一下。
 */
fun lruHits(requests: IntArray, capacity: Int): Int {
    TODO("数一数有几次命中")
}
