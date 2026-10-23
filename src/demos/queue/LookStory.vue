<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { lookFrames, SEATS } from '../../engine/queue';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Seats from './Seats.vue';

// 看：会动的绘本。每一页的椅子都由 lookFrames 真正执行入队、出队得到。
const frames = lookFrames();

const k = ref(0);
const f = computed(() => frames[Math.min(k.value, frames.length - 1)]);
const last = computed(() => k.value >= frames.length - 1);

/** 队头、队尾的小标签 */
const tags = computed(() => {
  const t: Record<number, string> = {};
  const { head, size } = f.value;
  if (size === 0) return t;
  const tail = (head + size - 1) % SEATS;
  t[head] = size === 1 ? '队头·队尾' : '队头';
  if (size > 1) t[tail] = '队尾';
  return t;
});

const labels = computed(() => f.value.seats.map((v, i) => i + ' 号椅子' + (v ? '：' + v : '：空') + (tags.value[i] ? '，' + tags.value[i] : '')));

const timer = ref<ReturnType<typeof setInterval> | null>(null);
function stop() {
  if (timer.value) clearInterval(timer.value);
  timer.value = null;
}
function play() {
  if (timer.value) return stop();
  if (last.value) k.value = 0;
  timer.value = setInterval(() => (last.value ? stop() : k.value++), 2600);
}
function next() { stop(); if (!last.value) k.value++; }
function prev() { stop(); if (k.value > 0) k.value--; }
function restart() { stop(); k.value = 0; }

onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
onBeforeUnmount(() => { stop(); window.removeEventListener(STAGE_CHANGE_EVENT, stop); });
</script>

<template>
  <div class="book">
    <p class="say" aria-live="polite">{{ f.say }}</p>
    <Seats
      :seats="f.seats" :ring="f.ring" :tags="tags" :head="f.size ? f.head : null"
      :glow="f.glow" center="🧑‍🍳🧋" empty="🪑" :labels="labels"
    />
    <p class="served" aria-label="已经买到奶茶的">
      <span class="cup" aria-hidden="true">🧋</span>
      <span v-for="(a, i) in f.served" :key="i">{{ a }}</span>
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
      <button type="button" class="btn" @click="restart">🔁 从头再看一次</button>
      <button type="button" class="btn primary" data-goto="play">🎮 去玩</button>
    </div>
  </div>
</template>

<style scoped>
.book { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.say { font-size: clamp(1.25rem, 5vw, 1.9rem); min-height: 2.6em; }
.served { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 1.8em; font-size: 1.4rem; }
.cup { padding-right: 6px; margin-right: 4px; border-right: 1.5px solid var(--line); }
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
