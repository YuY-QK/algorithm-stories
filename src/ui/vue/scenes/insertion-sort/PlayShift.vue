<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { toCards, type ShiftAction, type ShiftGame } from '../../../../engine/insertion-sort';
import Hand from './Hand.vue';

// 玩法二「挪一挪」的画面：牌桌，空位左边的牌能点；下面是罐子，每挪一次多一枚硬币，数错了硬币跳一跳。
const props = defineProps<{ state: ShiftGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ShiftAction] }>();
const cards = computed(() => toCards(props.state.values));
const playing = computed(() => props.state.phase === 'play');

const pulsing = ref(false);
let frame = 0;
watch(() => props.state.pulse, (n) => {
  pulsing.value = false;
  if (n > 0) frame = requestAnimationFrame(() => (pulsing.value = true));
});
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <Hand
    :cards="cards" :slots="state.slots" :held="playing ? state.i : null" :held-at="state.hole"
    :in-hand="playing ? state.i + 1 : state.values.length" :shake="state.shake" :glow="state.glow"
    :pickable="playing" :t="t" @card="(id: number) => emit('act', { type: 'card', id })" @hole="emit('act', { type: 'hole' })"
  />
  <div class="jar" :class="{ pulse: pulsing }" :aria-label="t(m('shift.jar', { n: state.coins }))">
    <span class="jar-icon" aria-hidden="true">🫙</span>
    <span v-for="c in state.coins" :key="c" class="coin" aria-hidden="true">🪙</span>
  </div>
</template>

<style scoped>
.jar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-height: 2.6rem;
  padding: 6px 12px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface);
  font-size: 1.6rem; line-height: 1; align-self: flex-start; max-width: 100%; box-sizing: border-box;
}
.jar-icon { margin-right: 6px; }
.coin { animation: drop 0.4s ease-out; }
.jar.pulse .coin { animation: pop 0.5s ease-in-out 2; }

@keyframes drop {
  from { transform: translateY(-24px); opacity: 0; }
}
@keyframes pop {
  50% { transform: scale(1.3); }
}
@media (prefers-reduced-motion: reduce) {
  .coin, .jar.pulse .coin { animation: none; }
}
</style>
