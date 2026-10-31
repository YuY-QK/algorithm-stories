<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { bugCells, type Bug, type BugStep } from '../../../../engine/linear-search';
import Boxes from './Boxes.vue';

// 做：找 bug 的数组。越界那一轮多画一个虚线格。
defineProps<{ step: BugStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <Boxes
    :cells="bugCells(bug, step)" :pointer="step.i >= 0 && step.i <= bug.arr.length ? step.i : -1"
    :ghost="bug.id === 'overrun' && step.i >= bug.arr.length" :label="t(m('scene.array'))" :t="t"
  />
</template>
