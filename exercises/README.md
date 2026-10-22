# 亲手写：Kotlin 练习

每个关卡「做」这一步里的「亲手写」都在这里。网页负责看、玩、猜下一步和找 bug，代码在自己电脑上写。

## 打开

用 IntelliJ IDEA 或 Android Studio 打开这个 `exercises/` 目录（不是仓库根目录），等 Gradle 同步完成。需要 JDK 17 以上。

## 每一关

| 关卡 | 要写的文件 | 运行测试 |
|---|---|---|
| 二分查找 | `src/main/kotlin/binarysearch/BinarySearch.kt` | `./gradlew test --tests 'binarysearch.*'` |

1. 打开要写的文件，把 `TODO()` 换成你的代码。
2. 运行测试（命令行或 IDE 里测试类旁边的绿色三角）。
3. 全绿就过关。红了看失败信息，里面写着输入和期望的结果。

测试在 `src/test/kotlin/` 里，可以读，但别改。参考答案在 `solutions/`，自己写完、测试通过以后再去对照。

## 检查参考答案

```
./gradlew test -Psolutions
```

用参考答案跑同一套测试，CI 也用它确认测试本身没写错。
