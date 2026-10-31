<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { PredictView } from '../../../../engine/quick-sort';
import CallStack from './CallStack.vue';
import PartRow from './PartRow.vue';

// 做：猜下一步的一排格子和调用栈。「换到哪一格」「标杆落在哪」时格子能点，点错的红框，答错后正确的那格标出来。
defineProps<{ view: PredictView; picked: unknown; pickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [index: number] }>();
</script>

<template>
  <PartRow :step="view.step" :pickable="pickable" :miss="picked as number | null" :hit="view.hit" :t="t" @pick="(k: number) => emit('act', k)" />
  <CallStack :stack="view.step.stack" :t="t" />
</template>
