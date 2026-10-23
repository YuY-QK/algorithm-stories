package stack

/*
 * 关卡：栈「小熊叠盘子」
 *
 * 把下面三处 TODO() 换成你的代码，然后运行：
 *   ./gradlew test --tests 'stack.*'
 * 测试全绿就过关。卡住了先回网页上的「做」看看动画，实在不行再看 solutions/ 里的参考答案。
 */

/**
 * 第一关：自己做一个装 Int 的栈。不用标准库的集合，用一个 IntArray 加一个 size（栈里有几个）。
 *
 * - push：放到栈顶。数组满了就换一个两倍大的，把旧的拷过去（提示：copyOf）。
 * - pop：拿走并返回栈顶；栈空时抛 NoSuchElementException。
 * - peek：只看栈顶，不拿走；栈空时抛 NoSuchElementException。
 *
 * 例子：push(1) push(2) push(3) → pop() = 3，peek() = 2，size = 2
 */
class IntStack {
    private var data = IntArray(4)

    /** 栈里有几个元素，也是下一次 push 要写入的下标 */
    var size = 0
        private set

    fun isEmpty(): Boolean = size == 0

    fun push(x: Int) {
        TODO("放到栈顶，满了先扩容")
    }

    fun pop(): Int {
        TODO("拿走并返回栈顶")
    }

    fun peek(): Int {
        TODO("返回栈顶，不拿走")
    }
}

/**
 * 第二关：[s] 只含 ()[]{} 六种字符，判断括号是不是全部正确配对。
 *
 * 例子：isValid("{[()]}") = true   isValid("([)]") = false
 *      isValid("(()") = false     isValid("())") = false   isValid("") = true
 *
 * 提示：左括号入栈；右括号要和栈顶是同一种。网页「找 bug」里的三个坑，你都避开了吗？
 * 可以用 ArrayDeque<Char>，也可以用你的 IntStack（存 Char.code）。
 */
fun isValid(s: String): Boolean {
    TODO("写括号配对")
}

/**
 * 变种：逆波兰表达式求值（运算符写在两个数后面，不需要括号）。
 * [tokens] 里是整数或 + - * / 四种运算符，保证表达式合法、不会除以 0。
 * 除法和 Kotlin 的 Int 除法一样，向零取整。
 *
 * 例子：["2", "1", "+", "3", "*"] 就是 (2 + 1) * 3 = 9
 *      ["4", "13", "5", "/", "+"] 就是 4 + 13 / 5 = 6
 *
 * 提示：数字入栈；遇到运算符弹出两个数，算完把结果入栈。先弹出来的是右边那个数。
 */
fun evalRPN(tokens: List<String>): Int {
    TODO("写逆波兰表达式求值")
}
