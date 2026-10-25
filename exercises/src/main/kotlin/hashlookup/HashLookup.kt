package hashlookup

/*
 * 关卡：哈希查找「图书馆直接走到书架」
 *
 * 把下面两个类里的 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'hashlookup.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 *
 * 约定：哈希函数固定是「键对容量取余」，键和值都是 Int。
 * 不要依赖遍历顺序，也不要用 HashMap 来偷懒，目标是自己做出桶。
 */

/**
 * 链地址法：每个桶挂一串，撞了就接在后面。
 */
class ChainedIntMap(private val capacity: Int = 7) {
    /** 现在一共存了多少个键。键已存在时 put 是更新，size 不变。 */
    val size: Int
        get() = TODO("写 size")

    /**
     * 存入键值对；键已经存在就更新它的值。
     */
    fun put(key: Int, value: Int) {
        TODO("写 put")
    }

    /**
     * 取键对应的值；键不存在返回 null。
     */
    fun get(key: Int): Int? {
        TODO("写 get")
    }

    /**
     * 删除键；真的删掉了返回 true，键本来就不在返回 false。
     */
    fun remove(key: Int): Boolean {
        TODO("写 remove")
    }

    /**
     * 键所在的桶号，一定在 0 until capacity 之内，负数键也一样。
     * 例子：容量 7 时，bucketOf(15) = 1，bucketOf(-3) = 4。
     * 提示：Kotlin 里 -3 % 7 是 -3，不能直接当桶号。
     */
    fun bucketOf(key: Int): Int {
        TODO("写 bucketOf")
    }
}

/**
 * 变种：线性探测。桶被占了就往后一格，到头回到 0 号。
 * 删除要打「墓碑」：不能直接把桶清空，否则排在后面的键会断链，明明在表里却查不到。
 */
class ProbedIntMap(private val capacity: Int = 7) {
    /**
     * 存入键值对；键已存在就更新。表里没有空位（也没有墓碑可以复用）并且键不存在时返回 false，
     * 不能死循环。成功返回 true。
     */
    fun put(key: Int, value: Int): Boolean {
        TODO("写 put")
    }

    /**
     * 取值；不存在返回 null。碰到空桶就断定没有，碰到墓碑要继续往后看；
     * 表里一个空桶也没有时，最多看 capacity 个桶，不能死循环。
     */
    fun get(key: Int): Int? {
        TODO("写 get")
    }

    /**
     * 删除；删掉了返回 true，键不在返回 false。
     */
    fun remove(key: Int): Boolean {
        TODO("写 remove")
    }
}
