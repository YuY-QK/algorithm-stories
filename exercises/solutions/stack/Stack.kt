package stack

// 参考答案。自己写完、测试通过以后再来对照。

class IntStack {
    private var data = IntArray(4)

    var size = 0
        private set

    fun isEmpty(): Boolean = size == 0

    fun push(x: Int) {
        if (size == data.size) data = data.copyOf(data.size * 2) // 满了翻倍，均摊 O(1)
        data[size++] = x
    }

    fun pop(): Int {
        if (size == 0) throw NoSuchElementException("栈是空的")
        return data[--size] // 先减再读：栈顶在 size - 1
    }

    fun peek(): Int {
        if (size == 0) throw NoSuchElementException("栈是空的")
        return data[size - 1]
    }
}

fun isValid(s: String): Boolean {
    val stack = ArrayDeque<Char>()
    for (c in s) {
        if (c in "([{") {
            stack.addLast(c)
        } else {
            val top = stack.removeLastOrNull() ?: return false // 坑 1：栈可能是空的
            if (pairOf(top) != c) return false // 坑 3：种类要对上
        }
    }
    return stack.isEmpty() // 坑 2：剩下的左括号没配上
}

private fun pairOf(open: Char) = when (open) {
    '(' -> ')'
    '[' -> ']'
    else -> '}'
}

fun evalRPN(tokens: List<String>): Int {
    val stack = ArrayDeque<Int>()
    for (t in tokens) {
        if (t in setOf("+", "-", "*", "/")) {
            val b = stack.removeLast() // 先弹出来的是右操作数
            val a = stack.removeLast()
            stack.addLast(
                when (t) {
                    "+" -> a + b
                    "-" -> a - b
                    "*" -> a * b
                    else -> a / b
                },
            )
        } else {
            stack.addLast(t.toInt())
        }
    }
    return stack.last()
}
