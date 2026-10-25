# 栈：资料

## 1. 解决什么问题

栈（stack）是一种只在一头进出的数据结构：放进去叫入栈（push），拿出来叫出栈（pop），能看到、能拿到的只有最上面那个（栈顶，top）。所以**后进先出**（LIFO，Last In First Out）：最后放进去的最先出来。

凡是「先开始的事要等后开始的事做完才能收尾」，都适合用栈记录：括号配对、函数调用、撤销、回退、深度优先搜索。

## 2. 核心操作

| 操作 | 含义 | 时间 |
|---|---|---|
| `push(x)` | 把 x 放到栈顶 | O(1)（数组实现扩容时是均摊 O(1)） |
| `pop()` | 拿走并返回栈顶 | O(1) |
| `peek()` / `top` | 只看栈顶，不拿走 | O(1) |
| `isEmpty()` | 栈是不是空的 | O(1) |

两种常见实现：

- **数组 + 栈顶下标**：`IntArray` 加一个 `size`，`push` 写到 `arr[size++]`，`pop` 读 `arr[--size]`；满了就换一个两倍大的数组，把旧的拷过去。每次翻倍，n 次 push 总共拷贝不到 2n 次，所以均摊 O(1)。
- **链表**：每次在表头插入、删除。

Kotlin 里直接用标准库的 `ArrayDeque`：`addLast` 入栈、`removeLast` 出栈、`last()` 看栈顶。Java 的 `java.util.Stack` 是老类（继承自 `Vector`，方法都加了同步），官方文档建议改用 `Deque` 接口的实现，比如 `ArrayDeque`。

## 3. 关卡里用的例子：括号配对

给一个只含 `()[]{}` 的串，判断括号是不是全部正确配对（LeetCode 20）。

1. 从左往右扫。遇到左括号，入栈。
2. 遇到右括号，栈顶必须是同一种左括号：是就出栈（配上了），不是或者栈空就返回 false。
3. 扫完以后栈必须是空的，否则有左括号没配上。

时间 O(n)，空间 O(n)。为什么非用栈不可：只有一种括号时，一个计数器就够；有三种括号时，右括号要和**最近一个还没配上的**左括号比种类，这正是栈顶。

## 4. 易错点（具体到代码）

1. **右括号来时没检查栈空**：`val top = stack.removeLast()`。输入 `"())"` 或 `")"` 时，Kotlin `ArrayDeque.removeLast()` 抛 `NoSuchElementException`。应写 `stack.removeLastOrNull() ?: return false`。
2. **最后没检查栈是否为空**：结尾写成 `return true`。输入 `"(()"`、`"(("` 会被判成合法。应写 `return stack.isEmpty()`。
3. **只看是不是右括号，不看种类**：比如写成 `if (top !in "([{") return false`（栈里只放左括号，这个检查永远通过），或者干脆用计数器。输入 `"([)]"`、`"(]"` 会被判成合法。
4. 把左括号和右括号直接比 `top != c`：`'('` 永远不等于 `')'`，`"()"` 也会被判成不合法。
5. 自己用数组实现时，`pop` 忘了先 `size--` 再读，或者读完没把 `size` 减一。

## 5. 变种

- **逆波兰表达式求值**（LeetCode 150）：数字入栈，遇到运算符弹出两个数计算，结果再入栈。注意先弹出的是右操作数。
- **最小栈**（LeetCode 155）：再配一个辅助栈记录「到目前为止的最小值」，`getMin` O(1)。
- **出栈序列**（LeetCode 946，关卡里的挑战）：1..n 依次入栈、随时可以出栈，问某个出栈顺序能不能得到。贪心模拟：想要的数不在栈顶就一直入栈，它被压在下面就做不到。能得到的序列恰好是不含「3…1…2」形状（先出一个大的，后面先小后中）的排列，个数是卡特兰数 1, 2, 5, 14, 42…（n = 5 时 42 种）。
- **单调栈**：栈里保持递增或递减，用来找「下一个更大的元素」「柱状图中最大的矩形」等。

## 6. 真实应用

**生活**

- 叠盘子、叠书、羽毛球筒：只能从上面拿。
- 一层层穿衣服，脱的时候反过来。

**工程**

- **函数调用栈**：每调用一个函数，就把它的参数、局部变量、返回地址压成一个栈帧；函数返回时弹出。递归太深，栈空间用完，JVM 上就是 `StackOverflowError`。线程栈大小可以用 `-Xss` 调，默认值随平台和 JVM 版本不同（64 位 Linux 上默认线程栈是 1MB）。
- **JVM 字节码是基于栈的**：`iadd` 这类指令从操作数栈弹出两个数、把结果压回去（JVM 规范 2.6.2 节 Operand Stacks）。
- **撤销 / 重做**：编辑器把每次操作压进撤销栈；撤销时弹出并压进重做栈。
- **浏览器后退、前进**：可以看成两个栈（实际实现多是一个历史列表加当前位置，效果相同）。
- **表达式求值**：Dijkstra 的调度场算法（shunting-yard，1961）用栈把中缀表达式转成逆波兰式；HP 的 RPN 计算器（如 1972 年的 HP-35）就让用户直接按逆波兰式输入。
- **深度优先搜索**：递归写法用的是调用栈；改成迭代写法时自己维护一个栈。
- 编辑器、编译器检查括号、HTML/XML 标签是否配对。

## 7. 关卡讲法建议

| 步骤 | 讲法 |
|---|---|
| 看 | 小熊叠盘子：放 ⭐ 🌙 ❤️，拿走 ❤️，放 🌸，再全部拿完。拿走的顺序 ❤️ 🌸 🌙 ⭐，最先放的 ⭐ 最后拿到。 |
| 玩一 | 「拿盘子」：盘子一个个叠上去，问下一个拿到哪个。点被压着的盘子会晃一下，栈顶发光。最后追问「最先放的什么时候拿到」，让孩子说出「最后」。 |
| 玩二 | 「拼积木」：`(` `[` `{` 是左半块，`)` `]` `}` 是右半块。左半块叠进篮子，右半块来了要和最上面那块拼成一整块。三串里一串能全拼好、一串形状不对、一串多了一块。 |
| 做 | 逐步执行 `isValid`；猜每个字符是入栈、出栈配对还是 return false；三个坑（没判空、最后没判空、不看种类）；亲手写 `IntStack`、`isValid`、`evalRPN`；挑战：判断出栈序列能不能得到。 |

## 8. 参考资料

- Kotlin `ArrayDeque` 文档：<https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/-array-deque/>
- Java `java.util.Stack` 文档（建议用 `Deque` 代替）：<https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Stack.html>
- JVM 规范 2.6.2 Operand Stacks：<https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html#jvms-2.6.2>
- LeetCode 20 有效的括号：<https://leetcode.cn/problems/valid-parentheses/>
- LeetCode 150 逆波兰表达式求值：<https://leetcode.cn/problems/evaluate-reverse-polish-notation/>
- LeetCode 155 最小栈：<https://leetcode.cn/problems/min-stack/>
- LeetCode 946 验证栈序列：<https://leetcode.cn/problems/validate-stack-sequences/>
- Donald Knuth，《计算机程序设计艺术》第 1 卷 2.2.1 节「栈、队列和双端队列」
- 调度场算法：<https://en.wikipedia.org/wiki/Shunting_yard_algorithm>
