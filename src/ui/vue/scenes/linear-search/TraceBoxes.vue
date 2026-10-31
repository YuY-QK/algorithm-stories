<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { arrayCells, type LinearSearchStep, type TraceInput } from '../../../../engine/linear-search';
import Boxes from './Boxes.vue';

// 做：逐步执行的数组。箭头指着正在比较的下标，看过的变淡，命中的亮起来。
defineProps<{ input: TraceInput; step: LinearSearchStep; t: (msg: Msg) => string }>();
</script>

<template>
  <Boxes :cells="arrayCells(input.arr, step)" :pointer="step.i >= 0 && step.i < input.arr.length ? step.i : -1" :label="t(m('scene.array'))" :t="t" />
</template>
