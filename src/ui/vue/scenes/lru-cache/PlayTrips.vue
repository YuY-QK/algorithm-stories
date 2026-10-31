<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { BOOK_EMOJI, TRIP_BOOKS, TRIP_SEQ, tripsDone, type TripsAction, type TripsGame } from '../../../../engine/lru-cache';
import Desk from './Desk.vue';

// 玩法二「猜猜去几趟书架」的画面：要借的书排成一行，书桌，已经跑的趟数，和两个回答按钮。
// 猜错的按钮晃一下（按钮换 key 重新播放动画），书其实在桌上时那本一闪一闪。都是 state 里的字段，这里只读。
const props = defineProps<{ state: TripsGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: TripsAction] }>();

const s = computed(() => props.state);
const done = computed(() => tripsDone(s.value));
const tick = computed(() => s.value.wrong?.[1] ?? 0);
</script>

<template>
  <div class="queue" :aria-label="t(m('scene.queueAria'))">
    <span v-for="(b, k) in TRIP_SEQ" :key="k" :class="{ done: k < s.i, now: k === s.i }">{{ BOOK_EMOJI[b] }}</span>
  </div>
  <Desk :cap="s.cap" :desk="s.desk" :books="TRIP_BOOKS" :pulse="s.pulse" :ruler="false" :t="t" />
  <p class="trips" :aria-label="t(m('scene.tripsAria', { n: s.count }))">
    <span v-for="n in s.count" :key="n">🚶</span>
    <small v-if="!s.count">{{ t(m('scene.noTripsYet')) }}</small>
  </p>

  <div v-if="!done" class="answers">
    <button
      :key="'h' + tick" type="button" class="btn big-btn" :class="{ wiggle: s.wrong?.[0] === 'hit' }"
      :aria-label="t(m('trips.yesAria'))" @click="emit('act', { type: 'guess', g: 'hit' })"
    >{{ t(m('trips.yes')) }}</button>
    <button
      :key="'m' + tick" type="button" class="btn big-btn" :class="{ wiggle: s.wrong?.[0] === 'miss' }"
      :aria-label="t(m('trips.noAria'))" @click="emit('act', { type: 'guess', g: 'miss' })"
    >{{ t(m('trips.no')) }}</button>
  </div>
</template>

<style scoped>
.queue { display: flex; flex-wrap: wrap; gap: 4px; font-size: 1.3rem; }
.queue span { opacity: 0.35; filter: grayscale(1); }
.queue span.done { opacity: 1; filter: none; }
.queue span.now { opacity: 1; filter: none; outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
.trips { min-height: 1.8em; font-size: 1.2rem; display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
.trips small { font-size: 13px; color: var(--muted); }
.big-btn { font-size: 1.15rem; padding: 14px 16px; }
.big-btn.wiggle { animation: wiggle 0.5s; border-color: var(--warn); }
@keyframes wiggle { 20% { transform: translateX(-7px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
@media (prefers-reduced-motion: reduce) { .big-btn.wiggle { animation: none; } }
</style>
