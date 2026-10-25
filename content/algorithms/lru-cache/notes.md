# LRU 缓存：资料

## 一句话

缓存容量有限，满了就淘汰「最久没被访问过」的那一项。get 和 put 都算访问。

## 原理

- 接口：`get(key)` 有就返回值（并算作刚用过），没有返回 -1；`put(key, value)` key 已存在就更新值（也算刚用过，不淘汰任何人），是新 key 则满了先淘汰最久没用的再放入。
- O(1) 的做法：`HashMap<Key, Node>` 加双向链表。哈希表按 key 一步拿到节点；双向链表拿到节点后，改前后邻居的指针就能摘下来（单链表摘节点需要找前驱，是 O(n)），再接到尾部。约定：靠近 head 的是最久没用的，靠近 tail 的是最近用过的。
- 头尾哨兵节点：链表空与不空、删头删尾都不用特判。
- Kotlin/Java 的捷径：`LinkedHashMap(capacity, 0.75f, true)`（第三个参数 accessOrder = true）按访问顺序排列，重写 `removeEldestEntry` 返回 `size > capacity` 即可。它内部就是哈希表加双向链表。
- 与 FIFO 的区别：FIFO 只看上桌顺序，命中不改变顺序；LRU 命中会挪到最近端。

## 复杂度

- 时间：get、put 均摊 O(1)（哈希表平均 O(1)）。
- 空间：O(capacity)。
- 数组或单向链表的朴素实现：找 key 要 O(n)，或挪动元素 O(n)。

## 易错点（对应「找 bug」）

1. get 命中后忘了 `touch(n)`：顺序不变，刚用过的会被先淘汰，LRU 退化成 FIFO。
2. 淘汰时只从链表摘了节点，哈希表里写成 `map.remove(key)`（删了新 key 而不是 `eldest.key`）：哈希表留下「幽灵」，之后 get 到本该淘汰的数据，size 超过容量。
3. put 已存在的 key 时更新完忘了 `return`：继续当新 key 处理，满了就误淘汰别人，链表里出现重复节点。
4. 其他常见错误（未做成关卡）：容量比较写成 `map.size > capacity` 导致多存一个；淘汰 `tail.prev`（最近用的）而不是 `head.next`；put 已存在的 key 没更新值；`removeEldestEntry` 里忘了它在 put 之后才被调用，写成 `size >= capacity` 会少存一个。
5. 值本身可能就是 -1 时，用 -1 表示「没有」会有歧义；LeetCode 146 约定值非负。

## 真实应用

- Android `android.util.LruCache`：内部是 accessOrder 的 `LinkedHashMap`，`sizeOf()` 默认返回 1（按个数），重写后可按字节数算容量；常用于缓存 Bitmap。方法是同步的。（已核对 Android 开发者文档）
- Redis：`maxmemory-policy` 里有 `allkeys-lru`、`volatile-lru` 等。Redis 用的是近似 LRU：随机抽样若干 key，淘汰其中最久没用的；`maxmemory-samples` 默认 5，调大更接近真 LRU、更耗 CPU。（来自 Redis 官方「Key eviction」文档的检索摘要；官网当时无法直接访问，细节如默认值建议再核对）
- 操作系统页面置换：纯 LRU 每次访存都要维护顺序，代价太高，实际多用近似（如 Clock）。Linux 内核的页面置换是近似 LRU（如双链表、MGLRU）。
- 数据库缓冲池：MySQL InnoDB 的 buffer pool 用 LRU 的变种（分新旧两段，新读入的页先放中间），避免全表扫描冲掉热数据。old 区默认约占 37%。

## 其他策略

- FIFO：先进先出。有 Belady 异常：序列 1 2 3 4 1 2 5 1 2 3 4 5，放 3 个缺失 9 次，放 4 个缺失 10 次（已用程序核对）。LRU 是栈算法，没有这个异常（测试里随机验证了命中数不随容量减少）。
- LFU：淘汰访问次数最少的；要处理旧热点不退场的问题。
- Clock：给每项一个访问位，指针轮转，LRU 的便宜近似。
- 2Q、ARC、TinyLFU 等：对付「一次性扫描冲掉热数据」的改良。（仅列名）
- LRU 的坏情况：容量 N，循环访问 N+1 个不同的 key，每次都缺失。

## 关卡讲法建议

- 看：用书桌和书架的故事，一页一个动作，最后点明「最右边最近、最左边最久」。
- 玩一：孩子亲手点「放回哪本」。第二次刻意让「最先上桌的 2 号」刚被翻过，孩子要意识到不是看上桌顺序而是看最近碰过。
- 玩二：猜桌上有没有，数跑书架的趟数，再换大桌子对比。
- 做：主线用哈希表加双向链表的 Kotlin，逐步执行时把 `touch` 拆成 remove 和 addLast 两步；LinkedHashMap 放在练习第二关和延伸里。
- 挑战：预测命中次数，再和 FIFO 比。

## 参考资料

- LeetCode 146. LRU Cache
- Android 文档：https://developer.android.com/reference/android/util/LruCache
- Redis 文档：Key eviction（https://redis.io/docs/latest/develop/reference/eviction/）
- Java 文档：`LinkedHashMap` 的 accessOrder 与 `removeEldestEntry`
