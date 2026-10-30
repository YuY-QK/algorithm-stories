<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { Bug, InsertionStep } from '../../../../engine/insertion-sort';
import SortRow from './SortRow.vue';

// 做：找 bug 的一排格子。看稳定性的坑里，每个元素带上花色。
defineProps<{ step: InsertionStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <SortRow :step="step" :suits="bug.suits" />
</template>
