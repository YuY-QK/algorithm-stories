# 队列：资料

## 1. 解决什么问题

一批东西要「按到达的顺序」处理：先来的先处理，后来的排在后面等。这就是队列（queue），规则叫**先进先出**（FIFO，First In First Out）。

两个基本操作：

- 入队 `offer` / `enqueue`：放到队尾。
- 出队 `poll` / `dequeue`：从队头取走一个。

常配的辅助操作：`peek`（看一眼队头不取走）、`size`、`isEmpty`、`isFull`（有容量限制时）。

## 2. 怎么实现

**① 普通数组，每次从头部删除**：出队后把后面的元素整体往前挪一格。出队 O(n)，数据多了很慢。

**② 链表**：头指针出队、尾指针入队，都是 O(1)，但每个元素多一个指针，内存不连续。

**③ 循环队列（环形缓冲区，ring buffer）**：固定容量的数组，加两个下标：

- `head`：下一个出队的格子；`tail`：下一个入队的格子。
- 入队写 `items[tail]`，然后 `tail = (tail + 1) % 容量`；出队读 `items[head]`，然后 `head = (head + 1) % 容量`。
- 走到数组末尾就绕回 0 号格，前面空出来的格子循环使用，谁都不用挪。

本关的 Kotlin 代码用 `head`、`tail`、`size` 三个字段，`size` 用来区分空和满。

## 3. 复杂度和性质

| 项目 | 值 |
|---|---|
| 入队、出队、peek | 循环队列和链表 O(1)；普通数组头部删除的出队 O(n) |
| 空间 | 循环队列 O(容量)，预先分配好 |
| 顺序 | 严格先进先出 |
| 两个栈实现的队列 | 单次出队最坏 O(n)（要把一个栈倒进另一个），均摊 O(1)：每个元素最多被倒一次 |

## 4. 易错点（具体到代码）

1. **下标忘了取模**：`tail = tail + 1` 或 `head = head + 1`。走到末尾后下标等于容量，下一次读写 `items[容量]` 越界（Kotlin/Java 抛 `ArrayIndexOutOfBoundsException`）。「找 bug」坑 1。
2. **只用 `head == tail` 判断空**：空的时候 `head == tail`，装满时 `tail` 绕一圈追上 `head`，也是 `head == tail`。只看两个下标分不清空和满，满的队列会被判成空。「找 bug」坑 2。常见的三种解法：
   - 另记一个 `size`（或 `count`），本关的写法；Java 的 `ArrayBlockingQueue` 也是这样（字段 `items`、`takeIndex`、`putIndex`、`count`，见参考资料）。
   - 故意空出一格不用：满的条件写成 `(tail + 1) % 容量 == head`。Java 的 `ArrayDeque` 就是这样，源码注释说数组「always has at least one null slot (at tail)」，`isEmpty()` 直接比较 `head == tail`。PC 的 BIOS 键盘缓冲区 16 格只能存 15 个按键，通常解释为同一个原因（待核实：没找到 IBM 原始文档，依据是 DOSBox 等模拟器的实现）。
   - 下标一直往上加不取模，用 `tail - head` 算个数，读写时再对容量取模（容量取 2 的幂时可以用位与）。Linux 内核的 `kfifo` 用的是这种思路（待核实具体实现细节）。
3. **满的判断差一**：写成 `size > items.size`，永远是假，满了还往里写，`tail` 正好落在 `head` 上，把最早的元素盖掉。「找 bug」坑 3。
4. **出队后忘了移动 head**：每次 poll 都返回同一个元素。
5. **以为出队要把格子清空**：对 `IntArray` 不需要，旧值留在格子里，只是已经在 `head` 后面、不算队里的了（「挑战」考的就是这一点）。存对象的队列最好置 null，免得旧对象一直被引用，不能被垃圾回收（`ArrayDeque` 出队时会把格子置 null）。

## 5. 真实应用

**生活**：排队买奶茶、银行叫号、打印机排队打印。

**工程**

- **标准库**：Java/Kotlin 的 `ArrayDeque` 内部是会扩容的循环数组；`java.util.concurrent.ArrayBlockingQueue` 是定长循环数组加锁，满了 `put` 会等。
- **键盘缓冲区**：按键先进环形缓冲区，程序按顺序取。PC BIOS 的缓冲区在内存 `0040:001E`，32 字节，头尾指针在 `0040:001A`、`0040:001C`。
- **网卡和音频**：网卡收发包用环形描述符队列（Linux 下 `ethtool -g` 可以看 RX/TX ring 的大小）；声卡播放、录音也是环形缓冲区，写的一方追着读的一方。
- **打印队列、任务队列**：先提交的任务先执行。
- **消息队列**：Kafka 的每个分区是一条只往后追加的日志，同一分区里按写入顺序读；读完不删除，按保留时间或大小清理。它是「队列思想」的大规模版本，不是循环数组。
- **Android 的 Looper / MessageQueue**：主线程不停从 `MessageQueue` 取消息处理。注意它不是严格的先进先出：内部是按 `when`（该处理的时间）排序的单链表，时间相同的按放入的先后（待核实：依据对 AOSP 源码 `enqueueMessage` 的记忆，本次没能联网核对）。
- **广度优先搜索（BFS）**：用队列保证先处理离起点近的节点，一层一层往外扩。

## 6. 常见变种

- 双端队列（deque）：两头都能进出，`ArrayDeque` 就是。
- 优先队列：不按到达顺序，按优先级出队（堆），名字里有「队列」但不是先进先出。
- 阻塞队列：空了取的一方等，满了放的一方等，生产者-消费者模型的基础。
- 用两个栈实现队列：经典面试题，均摊 O(1)。

## 7. 关卡讲法建议

- 看：奶茶店门口 6 把椅子。先排成一排：新来的坐队尾，店员只叫队头。队头往后走，后面的椅子坐满了，前面却空着 —— 把椅子围成一圈，5 号后面就是 0 号，这就是循环队列。坐满了再来人只能等（满了）。
- 玩法一「谁先买到？」：顾客陆续来，店员问下一个是谁，孩子点队头；最后问「谁能先买到」，个子最大的 🐘 来得晚也得排队。
- 玩法二「我是店员」：椅子围成一圈，按指令卡给新来的找椅子（tail）、点出买到奶茶的人（head），过程中一定会从 5 号绕回 0 号。
- 做：逐步执行看数组和 head、tail 绕回；猜下一步写到哪格、指针绕到哪；三个坑（忘取模、head == tail 判空、满的判断差一）；挑战是预测一串操作后数组里每一格的值（出队不擦格子）。

## 8. 参考资料

- OpenJDK `ArrayBlockingQueue` 源码：<https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/concurrent/ArrayBlockingQueue.java>
- OpenJDK `ArrayDeque` 源码：<https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/ArrayDeque.java>
- Kotlin `ArrayDeque` 文档：<https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/-array-deque/>
- Linux 内核文档 Circular Buffers：<https://docs.kernel.org/core-api/circular-buffers.html>
- BIOS 键盘缓冲区：<https://fysnet.net/kbuffio.htm>、BIOS Data Area <https://www.cs.yale.edu/flint/feng/cos/resources/BIOS/Resources/assembly/biosdataarea.html>
- Kafka 文档（分区内有序、保留策略）：<https://kafka.apache.org/documentation/#intro_concepts_and_terms>
- Android `MessageQueue` 文档：<https://developer.android.com/reference/android/os/MessageQueue>
