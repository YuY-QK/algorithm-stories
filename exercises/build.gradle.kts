plugins {
    kotlin("jvm") version "2.0.21"
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(kotlin("test"))
}

// ./gradlew test -Psolutions 用 solutions/ 里的参考答案跑测试（CI 用它检查测试本身没写错）。
// 换一个构建目录，免得和自己写的代码的编译结果混在一起。
if (project.hasProperty("solutions")) {
    sourceSets["main"].kotlin.setSrcDirs(listOf("solutions"))
    layout.buildDirectory.set(file("build-solutions"))
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("passed", "failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}
