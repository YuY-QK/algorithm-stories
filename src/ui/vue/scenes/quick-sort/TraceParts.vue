<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { QuickStep, TraceInput } from '../../../../engine/quick-sort';
import PartRow from './PartRow.vue';

// 做：逐步执行的一排格子。标出 i、j、标杆，按矮队 / 高队 / 标杆 / 已站定上色，当前调用的区间外的格子变淡。
defineProps<{ input: TraceInput; step: QuickStep; t: (msg: Msg) => string }>();
</script>

<template>
  <PartRow :step="step" :t="t" />
</template>
