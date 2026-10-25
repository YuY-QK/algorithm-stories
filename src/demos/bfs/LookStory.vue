<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { KID_MAZES, parseMaze, pathTo, waves } from '../../engine/bfs';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Maze, { type Tone } from './Maze.vue';

// 看：会动的绘本。每一圈水波都由 waves（按层的 BFS）生成，和真实的搜索过程一致。
interface Frame {
  say: string;
  tones: Record<number, Tone>;
  labels: Record<number, number>;
  mouse: number;
}

const which = ref(0);
const maze = computed(() => parseMaze(KID_MAZES[which.value]));

const frames = computed<Frame[]>(() => {
  const m = maze.value;
  const wv = waves(m);
  const best = wv.dist[m.end];
  const out: Frame[] = [];
  out.push({ say: '小老鼠 🐭 闻到了奶酪 🧀 的香味，可是迷宫弯弯绕绕', tones: {}, labels: {}, mouse: m.start });
  out.push({ say: '它的秘诀：像水波 🌊 一样，一圈一圈往外找', tones: { [m.start]: 'ring' }, labels: { [m.start]: 0 }, mouse: m.start });
  const tones: Record<number, Tone> = { [m.start]: 'old' };
  const labels: Record<number, number> = { [m.start]: 0 };
  for (let k = 1; k < wv.rings.length; k++) {
    const ring = wv.rings[k];
    const now = { ...tones };
    for (const id of ring) {
      now[id] = 'ring';
      labels[id] = k;
    }
    const hit = ring.includes(m.end);
    out.push({
      say: hit ? '第 ' + k + ' 圈碰到奶酪啦 🧀！' : k === 1 ? '走 1 步能到这 ' + ring.length + ' 格' : '再走 1 步：第 ' + k + ' 圈有 ' + ring.length + ' 格',
      tones: now,
      labels: { ...labels },
      mouse: m.start,
    });
    for (const id of ring) tones[id] = 'old';
  }
  const path = pathTo(wv, m.end);
  const pathTones: Record<number, Tone> = { ...tones };
  for (const id of path) pathTones[id] = 'path';
  out.push({ say: '从奶酪倒着数回去：' + Array.from({ length: best + 1 }, (_, k) => best - k).join(' → '), tones: pathTones, labels: { ...labels }, mouse: m.start });
  out.push({ say: '沿着这条路，' + best + ' 步就吃到奶酪 🎉 没有更近的路了', tones: pathTones, labels: { ...labels }, mouse: m.end });
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
  timer.value = setInterval(() => (last.value ? stop() : k.value++), 1900);
}
function next() { stop(); if (!last.value) k.value++; }
function prev() { stop(); if (k.value > 0) k.value--; }
function another() {
  stop();
  which.value = (which.value + 1) % KID_MAZES.length;
  k.value = 0;
}

onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
onBeforeUnmount(() => { stop(); window.removeEventListener(STAGE_CHANGE_EVENT, stop); });
</script>

<template>
  <div class="book">
    <p class="say" aria-live="polite">{{ f.say }}</p>
    <Maze :maze="maze" :tones="f.tones" :labels="f.labels" :mouse="f.mouse" />
    <div class="dots" aria-hidden="true">
      <span v-for="(_, i) in frames" :key="i" :class="{ on: i === k }" />
    </div>
    <div class="nav">
      <button type="button" class="big" :disabled="k === 0" aria-label="上一页" @click="prev">◀</button>
      <button type="button" class="big main" :aria-label="timer ? '暂停' : '自动播放'" @click="play">{{ timer ? '⏸' : '▶️' }}</button>
      <button type="button" class="big" :disabled="last" aria-label="下一页" @click="next">▶</button>
    </div>
    <div v-if="last" class="row">
      <button type="button" class="btn" @click="another">🧀 换个迷宫再看一次</button>
      <button type="button" class="btn primary" data-goto="play">🎮 去玩</button>
    </div>
  </div>
</template>

<style scoped>
.book { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.say { font-size: clamp(1.3rem, 5vw, 1.9rem); min-height: 2.6em; }
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
