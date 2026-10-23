PAIRS = {"(": ")", "[": "]", "{": "}"}


def is_valid(s):
    """括号串是否完全配对：左括号入栈，右括号必须和栈顶是一对，扫完栈要空。"""
    stack = []
    for c in s:
        if c in PAIRS:
            stack.append(c)
        else:
            if not stack:
                return False
            top = stack.pop()
            if PAIRS[top] != c:
                return False
    return not stack


def eval_rpn(tokens):
    """逆波兰表达式求值，除法向零取整（和 Kotlin 的 Int 除法一样）。"""
    stack = []
    for t in tokens:
        if t in ("+", "-", "*", "/"):
            b = stack.pop()
            a = stack.pop()
            if t == "+":
                stack.append(a + b)
            elif t == "-":
                stack.append(a - b)
            elif t == "*":
                stack.append(a * b)
            else:
                q = abs(a) // abs(b)
                stack.append(q if (a >= 0) == (b > 0) else -q)
        else:
            stack.append(int(t))
    return stack[-1]


def can_pop(n, want):
    """1..n 依次入栈、随时可以出栈，出栈顺序能不能正好是 want。"""
    stack = []
    nxt = 1
    for w in want:
        while (not stack or stack[-1] != w) and nxt <= n:
            stack.append(nxt)
            nxt += 1
        if not stack or stack[-1] != w:
            return False
        stack.pop()
    return True


if __name__ == "__main__":
    import itertools
    import random

    def slow_valid(s):
        prev = None
        while prev != s:
            prev = s
            s = s.replace("()", "").replace("[]", "").replace("{}", "")
        return s == ""

    for _ in range(20000):
        s = "".join(random.choice("()[]{}") for _ in range(random.randint(0, 12)))
        assert is_valid(s) == slow_valid(s), s
    assert is_valid("{[()]}") and not is_valid("([)]") and not is_valid("((") and not is_valid("())")

    assert eval_rpn(["2", "1", "+", "3", "*"]) == 9
    assert eval_rpn(["4", "13", "5", "/", "+"]) == 6
    assert eval_rpn(["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]) == 22
    assert eval_rpn(["7", "-2", "/"]) == -3

    catalan = [1, 1, 2, 5, 14, 42, 132]
    for n in range(1, 7):
        ok = sum(can_pop(n, list(p)) for p in itertools.permutations(range(1, n + 1)))
        assert ok == catalan[n], n
    assert can_pop(5, [3, 2, 5, 4, 1]) and not can_pop(5, [4, 5, 3, 1, 2])
    print("stack: all tests passed")
