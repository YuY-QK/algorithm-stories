<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { MergeStep } from '../../../../engine/merge-sort';
import MergeView from './MergeView.vue';

// 做：猜下一步的画面，停在轨迹的某一步。答案都是选项按钮，由控件画，这里只画数组。
defineProps<{ view: MergeStep; picked: unknown; pickable: boolean; t: (msg: Msg) => string }>();
</script>

<template>
  <MergeView :step="view" :t="t" />
</template>
