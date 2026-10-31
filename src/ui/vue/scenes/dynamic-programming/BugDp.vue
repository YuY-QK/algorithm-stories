<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { Bug, DpStep } from '../../../../engine/dynamic-programming';
import DpRow from './DpRow.vue';

// 做：找 bug 的 dp 表，跟着当前步骤走。
defineProps<{ step: DpStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <DpRow :dp="step.dp" :cur="step.i !== null && step.i >= 0 && step.i < step.dp.length ? step.i : null" :t="t" />
</template>
