<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import type { ShootAction, ShootGame } from '../../../../engine/bubble-sort';
import Lineup from './Lineup.vue';

// 玩法一「当摄影师」的画面：排队的小伙伴，加一行「这一轮」换了几次。按钮由规则的 controls 给。
const props = defineProps<{ state: ShootGame; clickable: boolean; t: (msg: Msg) => string }>();
defineEmits<{ act: [action: ShootAction] }>();
const pairIdx = computed(() => (props.state.s.phase === 'pair' ? props.state.s.j : null));
</script>

<template>
  <Lineup
    :line="state.s.line" :pair="pairIdx" :fixed-from="state.s.end" :glow="state.glow" :shake="state.shake"
    :photo="state.s.phase === 'done'" :t="t"
  />
  <p :key="state.hint" class="tally" :class="{ hinted: state.hint > 0 }" :aria-label="t(m('shoot.tallyAria', { n: state.s.roundSwaps }))">
    <span class="lab" aria-hidden="true">{{ t(m('shoot.thisRound')) }}</span>
    <span v-for="n in state.s.roundSwaps" :key="n" aria-hidden="true">🔄</span>
    <span v-if="state.s.roundSwaps === 0" class="zero" aria-hidden="true">0</span>
  </p>
</template>

<style scoped>
.tally { display: flex; align-items: center; gap: 4px; min-height: 1.8em; font-size: 1.2rem; padding: 2px 10px; border-radius: 10px; align-self: flex-start; margin: 0; }
.tally .lab { font-size: 13px; color: var(--muted); margin-right: 4px; }
.tally .zero { font: 700 1.1rem var(--mono); color: var(--muted); }
.tally.hinted { animation: glowbox 0.9s ease-in-out 2; }
@keyframes glowbox {
  50% { box-shadow: 0 0 0 3px var(--mid), 0 0 16px 4px var(--mid); }
}
@media (prefers-reduced-motion: reduce) {
  .tally.hinted { animation: none; box-shadow: 0 0 0 3px var(--mid); }
}
</style>
