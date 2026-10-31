<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import { slotPiles, type Bug, type BugStep } from '../../../../engine/hash-lookup';
import Shelves from './Shelves.vue';

// 做：找 bug 的一排书架。下标越界（负数或超出）时管理员不站在任何一个书架前。
defineProps<{ step: BugStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <Shelves :piles="slotPiles(step.slots)" :keeper="step.i !== null && step.i >= 0 && step.i < step.slots.length ? step.i : null" :t="t" />
</template>
