<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { Bug, MergeStep } from '../../../../engine/merge-sort';
import MergeView from './MergeView.vue';

// 做：找 bug 的画面。有些坑要看花色（稳定性），bug.suits 为真时每个元素带上花色。
defineProps<{ step: MergeStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <MergeView :step="step" :suits="bug.suits" :t="t" />
</template>
