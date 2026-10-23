package stack

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class StackTest {
    private val rnd = Random(42)

    /* ---------- IntStack ---------- */

    @Test
    fun `IntStack：后进先出`() {
        val s = IntStack()
        assertTrue(s.isEmpty(), "新建的栈应该是空的")
        s.push(1); s.push(2); s.push(3)
        assertEquals(3, s.size, "放了 3 个")
        assertEquals(3, s.pop(), "push 1 2 3 之后 pop，应该拿到最后放的 3")
        assertEquals(2, s.peek(), "peek 应该看到 2")
        assertEquals(2, s.size, "peek 不拿走，应该还剩 2 个")
        assertEquals(2, s.pop())
        assertEquals(1, s.pop())
        assertTrue(s.isEmpty(), "全拿完应该是空的")
    }

    @Test
    fun `IntStack：空栈 pop 和 peek 抛 NoSuchElementException`() {
        val s = IntStack()
        assertFailsWith<NoSuchElementException>("空栈 pop") { s.pop() }
        assertFailsWith<NoSuchElementException>("空栈 peek") { s.peek() }
        s.push(7)
        s.pop()
        assertFailsWith<NoSuchElementException>("放一个拿一个以后再 pop") { s.pop() }
    }

    @Test
    fun `IntStack：放十万个也不会满`() {
        val s = IntStack()
        repeat(100_000) { s.push(it) }
        assertEquals(100_000, s.size)
        for (i in 99_999 downTo 0) assertEquals(i, s.pop(), "倒着拿出来应该是 $i")
    }

    @Test
    fun `IntStack：随机操作和标准库 ArrayDeque 一致`() {
        val s = IntStack()
        val ref = ArrayDeque<Int>()
        repeat(20_000) { k ->
            if (ref.isEmpty() || rnd.nextInt(3) > 0) {
                val x = rnd.nextInt(-1000, 1000)
                s.push(x); ref.addLast(x)
            } else {
                assertEquals(ref.last(), s.peek(), "第 $k 步 peek")
                assertEquals(ref.removeLast(), s.pop(), "第 $k 步 pop")
            }
            assertEquals(ref.size, s.size, "第 $k 步 size")
        }
    }

    /* ---------- isValid ---------- */

    @Test
    fun `isValid：题目里的例子`() {
        assertEquals(true, isValid("{[()]}"), "s = {[()]}")
        assertEquals(true, isValid("()[]{}"), "s = ()[]{}")
        assertEquals(true, isValid(""), "空串没有括号，算配对")
    }

    @Test
    fun `isValid：右括号多了不会崩溃`() {
        for (s in listOf(")", "())", "]", "()}")) assertEquals(false, isValid(s), "s = $s，右括号来的时候栈是空的，检查栈空了吗？")
    }

    @Test
    fun `isValid：左括号没配完`() {
        for (s in listOf("(", "((", "(()", "{[]")) assertEquals(false, isValid(s), "s = $s，扫完栈里还剩左括号，最后检查栈空了吗？")
    }

    @Test
    fun `isValid：种类要对上`() {
        for (s in listOf("(]", "([)]", "{)", "[(])")) assertEquals(false, isValid(s), "s = $s，配对时比较种类了吗？")
    }

    /** 笨办法：反复删掉相邻的一对，删空就合法 */
    private fun slowValid(s: String): Boolean {
        var t = s
        while (true) {
            val u = t.replace("()", "").replace("[]", "").replace("{}", "")
            if (u == t) return u.isEmpty()
            t = u
        }
    }

    @Test
    fun `isValid：随机串和笨办法一致`() {
        repeat(20_000) {
            val s = String(CharArray(rnd.nextInt(0, 13)) { "()[]{}"[rnd.nextInt(6)] })
            assertEquals(slowValid(s), isValid(s), "s = $s")
        }
    }

    /* ---------- evalRPN ---------- */

    @Test
    fun `evalRPN：题目里的例子`() {
        assertEquals(9, evalRPN(listOf("2", "1", "+", "3", "*")), "(2 + 1) * 3")
        assertEquals(6, evalRPN(listOf("4", "13", "5", "/", "+")), "4 + 13 / 5")
        assertEquals(22, evalRPN("10 6 9 3 + -11 * / * 17 + 5 +".split(" ")), "LeetCode 150 的例子")
        assertEquals(42, evalRPN(listOf("42")), "只有一个数")
    }

    @Test
    fun `evalRPN：减法和除法的顺序`() {
        assertEquals(3, evalRPN(listOf("5", "2", "-")), "5 2 - 是 5 - 2，先弹出来的 2 在右边")
        assertEquals(2, evalRPN(listOf("7", "3", "/")), "7 3 / 是 7 / 3")
        assertEquals(-3, evalRPN(listOf("7", "-2", "/")), "7 / -2 向零取整是 -3")
    }

    /** 随机表达式树：返回 (逆波兰 tokens, 值, 中缀写法) */
    private fun randomExpr(depth: Int): Triple<List<String>, Int, String> {
        if (depth == 0 || rnd.nextInt(3) == 0) {
            val v = rnd.nextInt(-9, 10)
            return Triple(listOf(v.toString()), v, v.toString())
        }
        val (ta, a, sa) = randomExpr(depth - 1)
        val (tb, b, sb) = randomExpr(depth - 1)
        val ops = if (b == 0) "+-*" else "+-*/"
        val op = ops[rnd.nextInt(ops.length)]
        val v = when (op) { '+' -> a + b; '-' -> a - b; '*' -> a * b; else -> a / b }
        return Triple(ta + tb + op.toString(), v, "($sa $op $sb)")
    }

    @Test
    fun `evalRPN：随机表达式`() {
        repeat(3000) {
            val (tokens, v, infix) = randomExpr(4)
            assertEquals(v, evalRPN(tokens), "tokens = $tokens，也就是 $infix")
        }
    }
}
