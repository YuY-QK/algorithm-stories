<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { PredictView } from '../../../../engine/dynamic-programming';
import DpRow from './DpRow.vue';

// 做：猜下一步的 dp 表。点格子 emit('act', 下标)，对错由规则判断；已经点对的格子（got）和选中的来源格亮着，点错的标红。
const props = withDefaults(defineProps<{ view: PredictView; picked: number | null; pickable: boolean; got?: number[]; t: (msg: Msg) => string }>(), { got: () => [] });
const emit = defineEmits<{ act: [index: number] }>();
const chosen = () => [...props.view.picked, ...props.got];
</script>

<template>
  <DpRow :dp="view.dp" :cur="view.cur" :picked="chosen()" :miss="picked" :fresh="view.fresh" :clickable="pickable" :t="t" @pick="(k) => emit('act', k)" />
</template>
