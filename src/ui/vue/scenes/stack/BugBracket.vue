<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { Bug, BugStep } from '../../../../engine/stack';
import BracketView from './BracketView.vue';

// 做：找 bug 的画面。有 bug 的代码在这串括号上怎么跑。
defineProps<{ step: BugStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <BracketView :s="bug.input" :i="step.i" :stack="step.stack" :top="step.top" :bad="step.done && step.i < bug.input.length" :t="t" />
</template>
