<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import { slotPiles, type HashLookupStep, type TraceInput } from '../../../../engine/hash-lookup';
import Shelves from './Shelves.vue';

// 做：逐步执行的一排书架。管理员站在正在看的那个桶前。
defineProps<{ input: TraceInput; step: HashLookupStep; t: (msg: Msg) => string }>();
</script>

<template>
  <Shelves :piles="slotPiles(step.slots)" :keeper="step.i !== null && step.i >= 0 ? step.i : null" :t="t" />
</template>
