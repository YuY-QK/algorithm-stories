<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { Bug, BubbleStep } from '../../../../engine/bubble-sort';
import Bars from './Bars.vue';

// 做：找 bug 的柱子。越界读的那一步多画一个虚线空格。
defineProps<{ step: BubbleStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <Bars :items="step.a" :j="step.j" :hl="step.hl" :ghost="step.outcome === 'crash'" />
</template>
