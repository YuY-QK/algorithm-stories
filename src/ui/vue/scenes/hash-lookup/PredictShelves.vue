<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import { slotPiles, type PredictView } from '../../../../engine/hash-lookup';
import Shelves from './Shelves.vue';

// 做：猜下一步的一排书架。可以点的书架点了就 emit('act', 桶号)，对错由规则判断；
// 答错后点错的书架描边，正确的书架亮起。
defineProps<{ view: PredictView; picked: number | null; pickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [bucket: number] }>();
</script>

<template>
  <Shelves :piles="slotPiles(view.slots)" :clickable="pickable" :picked="picked ?? view.ring" :hit="view.hit" :t="t" @pick="(i: number) => emit('act', i)" />
</template>
