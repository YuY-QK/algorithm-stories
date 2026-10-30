<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { QuickStep, TraceInput } from '../../../../engine/quick-sort';
import CallStack from './CallStack.vue';

// 做：逐步执行里，变量标签下面的递归调用栈（压下去、弹出来）。
defineProps<{ input: TraceInput; step: QuickStep; t: (msg: Msg) => string }>();
</script>

<template>
  <CallStack :stack="step.stack" :t="t" />
</template>
