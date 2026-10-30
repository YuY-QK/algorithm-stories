<script setup lang="ts">
import { handAsking, type HandAction, type HandGame } from '../../../../engine/selection-sort';
import type { Msg } from '../../../../core/types';
import Candies from './Candies.vue';
import CandyPair from './CandyPair.vue';

// 玩法二「小熊的手」的画面：一排糖果，小熊手里的和正在看的并排放大。「换」「留」的按钮由规则的 controls 给。
defineProps<{ state: HandGame; clickable: boolean; t: (msg: Msg) => string }>();
defineEmits<{ act: [action: HandAction] }>();
</script>

<template>
  <Candies
    :values="state.s.a" :sorted="state.s.done ? state.s.a.length : state.s.i"
    :bear="state.s.done ? null : state.s.held" :eye="handAsking(state) ? state.s.j : null" :t="t"
  />
  <div v-if="handAsking(state)" class="duel">
    <CandyPair :left="state.s.a[state.s.held]" :right="state.s.a[state.s.j]" left-tag="🐻" right-tag="👀" :glow="state.glow" :t="t" />
  </div>
</template>

<style scoped>
.duel { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
</style>
