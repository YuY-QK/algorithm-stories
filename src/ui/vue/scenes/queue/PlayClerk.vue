<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { clerkCard, type Card, type ClerkAction, type ClerkState } from '../../../../engine/queue';
import { useStageStop } from '../../shared/usePlayer';
import Seats from './Seats.vue';
import { seatLabel, tagText } from './seatLabel';

// 玩法二「我是店员」的画面：指令卡、围成一圈的椅子（被点的用 act 交给规则）、已经买到奶茶的。
// 点错时规则把 shake / glow 换成新的，这里让对应的椅子晃一下、透光；队头举手是 state.raise。
const props = defineProps<{ state: ClerkState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ClerkAction] }>();

// 透光：换了新的提示就先熄掉再亮，这样连着点错也会每次都亮一下
const glowing = ref<number[]>([]);
watch(() => props.state.glow, (v) => {
  glowing.value = [];
  if (v) requestAnimationFrame(() => (glowing.value = [v[0]]));
});
const clear = () => (glowing.value = []);
useStageStop(clear);
onBeforeUnmount(clear);

const ring = computed(() => props.state.ring);
const tags = computed<Record<number, string>>(() => (ring.value.size ? { [ring.value.head]: tagText(props.t, 'head') } : {}));
const labels = computed(() => ring.value.cells.map((v, i) => seatLabel(props.t, i, v, tags.value[i] ?? null)));
const done = computed(() => clerkCard(props.state) === null);

function ticketLabel(c: Card, k: number) {
  const at = props.state.at;
  const what = 'arrive' in c ? props.t(m('clerk.card.arrive', { who: c.arrive })) : props.t(m('clerk.card.sell'));
  return props.t(m('clerk.card.label', { n: k + 1, what })) + (k < at ? props.t(m('clerk.card.done')) : k === at ? props.t(m('clerk.card.now')) : '');
}
</script>

<template>
  <ol class="tickets" :aria-label="t(m('clerk.cards'))">
    <li
      v-for="(c, k) in state.game.cards"
      :key="k"
      class="ticket"
      :class="{ now: k === state.at, gone: k < state.at }"
      :aria-label="ticketLabel(c, k)"
    >
      <template v-if="'arrive' in c">{{ c.arrive }}<small>🚶</small></template>
      <template v-else>🧋</template>
    </li>
  </ol>
  <Seats
    :seats="ring.cells" ring :tags="tags" :head="ring.size ? ring.head : null"
    :glow="glowing" :shake="state.shake" :raise="state.raise" center="🧑‍🍳" empty="🪑"
    :clickable="clickable && !done" :labels="labels" @pick="(i: number) => emit('act', { type: 'pick', i })"
  />
  <p class="served" :aria-label="t(m('served.label'))">
    <span class="cup" aria-hidden="true">🧋</span>
    <span v-for="(a, i) in state.served" :key="i">{{ a }}</span>
  </p>
</template>

<style scoped>
.tickets { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.ticket {
  display: flex; align-items: center; justify-content: center; gap: 1px;
  min-width: 2.3em; height: 2.3em; padding: 0 4px; font-size: 1.15rem; border-radius: 8px;
  border: 1.5px solid var(--line); background: var(--surface);
}
.ticket small { font-size: 0.6em; }
.ticket.now { border-color: var(--mid); background: var(--mid); box-shadow: 0 0 0 3px var(--mid); }
.ticket.gone { opacity: 0.35; }
.served { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 1.8em; font-size: 1.4rem; }
.cup { padding-right: 6px; margin-right: 4px; border-right: 1.5px solid var(--line); }
</style>
