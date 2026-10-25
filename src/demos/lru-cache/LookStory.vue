<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { BOOK_EMOJI, KID_CAP, LOOK_SEQ, simulate } from '../../engine/lru-cache';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Desk from './Desk.vue';

// 看：会动的绘本。画面全部由 simulate(LOOK_SEQ) 生成，和真实的 LRU 过程一致。
interface Frame {
  say: string;
  desk: number[];
  pulse: number | null;
  glow: number | null;
  trips: number;
}

const BOOKS = Math.max(...LOOK_SEQ);
const em = (b: number) => BOOK_EMOJI[b] + b + ' 号';

const frames = computed<Frame[]>(() => {
  const acc = simulate(LOOK_SEQ, KID_CAP);
  const out: Frame[] = [];
  let trips = 0;
  const add = (say: string, desk: number[], extra: Partial<Frame> = {}) =>
    out.push({ say, desk, pulse: null, glow: null, trips, ...extra });

  add('书桌只放得下 ' + KID_CAP + ' 本书 📚 书架在很远的地方 🚶', []);
  trips = KID_CAP;
  add('先借了 ' + acc.slice(0, KID_CAP).map((a) => a.book).join(' ') + ' 号，桌子满了', acc[KID_CAP - 1].desk);

  let firstHit = true;
  let firstMiss = true;
  for (const a of acc.slice(KID_CAP)) {
    if (a.hit) {
      if (firstHit) {
        add('要 ' + em(a.book) + '：桌上有！✅', a.before, { pulse: a.book });
        add('拿起来看一看，放到最右边 👉', a.desk);
        firstHit = false;
      } else {
        add('要 ' + em(a.book) + '：桌上有 ✅ 放到最右边', a.desk);
      }
      continue;
    }
    trips++;
    if (firstMiss) {
      add('要 ' + em(a.book) + '：桌上没有，只好去书架 🚶', a.before, { pulse: a.book });
      add('桌子满了！' + em(a.evicted!) + '最久没碰，放回书架', a.before, { glow: a.evicted });
      add(em(a.book) + '坐到最右边', a.desk);
      firstMiss = false;
    } else {
      add('要 ' + em(a.book) + '：没有 🚶 放回最久没碰的 ' + em(a.evicted!), a.before, { glow: a.evicted, pulse: a.book });
      add(em(a.book) + '坐到最右边', a.desk);
    }
  }
  add('最久没碰的在左边，刚碰过的在右边 🎉 一共跑了 ' + trips + ' 趟书架', acc[acc.length - 1].desk);
  return out;
});

const k = ref(0);
const f = computed(() => frames.value[Math.min(k.value, frames.value.length - 1)]);
const last = computed(() => k.value >= frames.value.length - 1);

const timer = ref<ReturnType<typeof setInterval> | null>(null);
function stop() {
  if (timer.value) clearInterval(timer.value);
  timer.value = null;
}
function play() {
  if (timer.value) return stop();
  if (last.value) k.value = 0;
  timer.value = setInterval(() => (last.value ? stop() : k.value++), 2400);
}
function next() { stop(); if (!last.value) k.value++; }
function prev() { stop(); if (k.value > 0) k.value--; }
function again() { stop(); k.value = 0; }

onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
onBeforeUnmount(() => { stop(); window.removeEventListener(STAGE_CHANGE_EVENT, stop); });
</script>

<template>
  <div class="book">
    <p class="say" aria-live="polite">{{ f.say }}</p>
    <Desk :cap="KID_CAP" :desk="f.desk" :books="BOOKS" :pulse="f.pulse" :glow="f.glow" />
    <p class="trips" :aria-label="'已经跑了 ' + f.trips + ' 趟书架'">
      <span v-for="t in f.trips" :key="t">🚶</span>
      <small v-if="!f.trips">还没跑书架</small>
    </p>
    <div class="dots" aria-hidden="true">
      <span v-for="(_, i) in frames" :key="i" :class="{ on: i === k }" />
    </div>
    <div class="nav">
      <button type="button" class="big" :disabled="k === 0" aria-label="上一页" @click="prev">◀</button>
      <button type="button" class="big main" :aria-label="timer ? '暂停' : '自动播放'" @click="play">{{ timer ? '⏸' : '▶️' }}</button>
      <button type="button" class="big" :disabled="last" aria-label="下一页" @click="next">▶</button>
    </div>
    <div v-if="last" class="row">
      <button type="button" class="btn" @click="again">📖 再看一遍</button>
      <button type="button" class="btn primary" data-goto="play">🎮 去玩</button>
    </div>
  </div>
</template>

<style scoped>
.book { display: flex; flex-direction: column; gap: 16px; align-items: stretch; min-width: 0; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
.trips { min-height: 1.8em; font-size: 1.2rem; display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
.trips small { font-size: 13px; color: var(--muted); }
.dots { display: flex; flex-wrap: wrap; gap: 6px; }
.dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
.dots span.on { background: var(--accent); }
.nav { display: flex; gap: 12px; }
.big {
  font: inherit; font-size: 1.4rem; width: 3.2em; height: 2.4em; cursor: pointer;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.big.main { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.big:disabled { opacity: 0.35; cursor: not-allowed; }
.big:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
