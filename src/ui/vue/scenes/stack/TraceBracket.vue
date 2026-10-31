<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { StackStep } from '../../../../engine/stack';
import BracketView from './BracketView.vue';

// 做：逐步执行的画面。括号串、栈和刚弹出的栈顶。
defineProps<{ input: string; step: StackStep; t: (msg: Msg) => string }>();
</script>

<template>
  <BracketView :s="input" :i="step.i" :stack="step.stack" :top="step.top" :bad="step.done && step.result === false && step.i < input.length" :t="t" />
</template>
