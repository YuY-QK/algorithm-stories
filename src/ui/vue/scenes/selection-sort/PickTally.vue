<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';

// 玩法一结算里的一行：挑了几轮，每轮一个 👆
defineProps<{ n: number; rounds: number; t: (msg: Msg) => string }>();
</script>

<template>
  <p class="tally">
    <span aria-hidden="true"><span v-for="r in rounds" :key="r">👆</span></span>
    {{ t(m('pick.tally', { n, rounds })) }}
  </p>
</template>

<style scoped>
.tally { font-size: 1.1rem; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; margin: 0; }
</style>
