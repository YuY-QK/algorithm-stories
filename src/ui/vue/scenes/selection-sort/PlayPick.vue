<script setup lang="ts">
import { pairValues, type PickAction, type PickGame } from '../../../../engine/selection-sort';
import type { Msg } from '../../../../core/types';
import Candies from './Candies.vue';
import CandyPair from './CandyPair.vue';

// 玩法一「挑最小的」的画面：一排糖果，点错以后并排放大两颗比一比。「还要挑吗」的按钮由规则的 controls 给。
defineProps<{ state: PickGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: PickAction] }>();
</script>

<template>
  <Candies
    :values="state.a" :sorted="state.i" :bear="state.bear" :glow="state.glow" :pulse="state.pulse" :shake="state.shake"
    :clickable="clickable" :t="t" @pick="(k: number) => emit('act', { type: 'pick', k })"
  />
  <div v-if="state.phase === 'compare' && pairValues(state)" class="versus">
    <CandyPair
      :left="pairValues(state)!.l" :right="pairValues(state)!.r" clickable :shake="state.pairShake" :t="t"
      @pick="(side: 'l' | 'r') => emit('act', { type: 'side', side })"
    />
  </div>
</template>

<style scoped>
.versus { display: flex; }
</style>
