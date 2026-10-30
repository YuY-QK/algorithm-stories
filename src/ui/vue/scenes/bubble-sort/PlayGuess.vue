<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { GuessAction, GuessGame } from '../../../../engine/bubble-sort';
import Lineup from './Lineup.vue';

// 玩法二「谁会冒到最右边」的画面：排队的小伙伴，等孩子点一个。
defineProps<{ state: GuessGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: GuessAction] }>();
</script>

<template>
  <Lineup
    :line="state.line" :pair="state.pair" :fixed-from="state.fixedFrom" :glow="state.glow" :shake="state.shake"
    :clickable="clickable" :photo="state.phase === 'done'" :t="t" @pick="(k: number) => emit('act', { type: 'pick', k })"
  />
</template>
