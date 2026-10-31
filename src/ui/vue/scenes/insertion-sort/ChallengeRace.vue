<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import {
  CHALLENGE_N, laneDone, laneLetter, laneName, laneNow, racePrompt, raceRanks, type RaceAction, type RaceState,
} from '../../../../engine/insertion-sort';

// 做：挑战的画面。顶上一句话，下面四组数组同时跑插入排序，点一组猜它最快或最慢；跑起来以后每组显示挪了几次、第几名。
const props = defineProps<{ state: RaceState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: RaceAction] }>();

const prompt = computed(() => racePrompt(props.state));
const ranks = computed(() => raceRanks(props.state));
const running = computed(() => props.state.phase === 'race' || props.state.phase === 'end');

function label(k: number): string {
  const s = props.state;
  return props.t(m('chal.lane.aria', {
    l: laneLetter(k),
    fast: s.fast === k ? m('chal.lane.fast') : '',
    slow: s.slow === k ? m('chal.lane.slow') : '',
  }));
}
</script>

<template>
  <p class="note" aria-live="polite">{{ prompt ? t(prompt) : '' }}</p>
  <div class="lanes">
    <button
      v-for="(l, k) in state.lanes"
      :key="k"
      type="button"
      class="lane"
      :class="{ chosen: state.fast === k || state.slow === k, done: running && laneDone(state, k) }"
      :disabled="!clickable"
      :aria-label="label(k)"
      @click="emit('act', { type: 'choose', k })"
    >
      <span class="head">
        <b>{{ laneLetter(k) }}</b>
        <span v-if="state.fast === k" class="pick-tag">{{ t(m('chal.tag.fast')) }}</span>
        <span v-if="state.slow === k" class="pick-tag">{{ t(m('chal.tag.slow')) }}</span>
        <span v-if="state.phase === 'end'" class="kind">{{ t(laneName(l.kind)) }}</span>
      </span>
      <span class="sticks" :style="{ '--n': CHALLENGE_N }" aria-hidden="true">
        <i
          v-for="(v, x) in laneNow(state, k).arr"
          :key="x"
          :class="{ hole: x === laneNow(state, k).hole && laneNow(state, k).key !== null, vs: x === laneNow(state, k).cmp }"
          :style="{ height: (v / CHALLENGE_N) * 100 + '%' }"
        />
      </span>
      <span class="meter">
        <span>{{ t(m('chal.move1')) }} <b>{{ laneNow(state, k).moves }}</b> {{ t(m('chal.move2')) }}</span>
        <span v-if="running">{{ laneDone(state, k) ? t(m('chal.rank', { n: ranks[k] })) : '' }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.lanes { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 10px; }
.lane {
  font: inherit; color: var(--fg); text-align: left; cursor: pointer; min-width: 0;
  display: flex; flex-direction: column; gap: 8px; padding: 10px 12px;
  border-radius: 10px; border: 1.5px solid var(--line); background: var(--bg);
}
.lane:disabled { cursor: default; }
.lane:not(:disabled):hover { border-color: var(--accent); }
.lane:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.lane.chosen { border-color: var(--mid); }
.lane.done { border-color: var(--accent); }
.head { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; font-size: 14px; }
.head b { font: 700 16px var(--mono); }
.pick-tag { font-size: 13px; }
.kind { color: var(--muted); font-size: 13px; }
.sticks { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 3px; height: 56px; align-items: end; }
.sticks i { display: block; background: var(--muted); border-radius: 2px 2px 0 0; min-height: 3px; }
.sticks i.hole { background: transparent; outline: 1.5px dashed var(--muted); outline-offset: -1.5px; }
.sticks i.vs { background: var(--mid); }
.meter { display: flex; justify-content: space-between; gap: 8px; font: 500 13px var(--mono); color: var(--muted); }
.meter b { color: var(--fg); }
</style>
