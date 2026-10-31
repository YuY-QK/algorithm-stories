<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import { traceCoins, type GreedyStep, type TraceInput } from '../../../../engine/greedy';
import CoinRow from './CoinRow.vue';

// 做：逐步执行的面值一排。排序之前按原样显示（淡一点），排好以后当前的 c 高亮，下面写拿了几枚。
const props = defineProps<{ input: TraceInput; step: GreedyStep; t: (msg: Msg) => string }>();
const coins = () => (props.step.sorted.length ? props.step.sorted : traceCoins(props.input));
</script>

<template>
  <CoinRow :coins="coins()" :c="step.c" :picked="step.picked" :unsorted="!step.sorted.length" />
</template>
