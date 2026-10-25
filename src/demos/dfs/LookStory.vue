<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { KID_MAZES, bestSteps, parseMaze, shortestRoute, tour, type TourMove } from '../../engine/dfs';
import { STAGE_CHANGE_EVENT } from '../../components/shared/usePlayer';
import Grid, { type Tone } from './Grid.vue';
import { emojisOf, wallsOf } from './view';

// 看：会动的绘本。每一页都从 tour（探险家的完整行程，和真实的 DFS 一致）里截一段：
// 一口气往前走几步，或者碰壁以后退回几步。最后和 BFS 的最短路比一比。
interface Frame {
  say: string;
  tones: Record<number, Tone>;
  emojis: Record<number, string>;
}

const which = ref(0);
const maze = computed(() => parseMaze(KID_MAZES[which.value]));
const walls = computed(() => wallsOf(maze.value));

/** 一口气往前走最多这么多步就翻一页，免得一页走太长看不清 */
const CHUNK = 5;

const frames = computed<Frame[]>(() => {
  const m = maze.value;
  const moves = tour(m);
  const pathTones = (mv: TourMove, extra: Record<number, Tone> = {}): Record<number, Tone> => {
    const t: Record<number, Tone> = {};
    mv.visited.forEach((v, id) => {
      if (v) t[id] = 'crumb';
    });
    for (const id of mv.path) t[id] = 'path';
    return { ...t, ...extra };
  };
  const at = (say: string, mv: TourMove, extra: Record<number, Tone> = {}): Frame => ({
    say, tones: pathTones(mv, extra), emojis: emojisOf(m, mv.cell, mv.visited),
  });

  const out: Frame[] = [];
  const first = moves[0];
  out.push({ say: '探险家 🧭 走进山洞，要找宝藏 💎', tones: {}, emojis: emojisOf(m, m.start) });
  out.push({ say: '遇到岔路口，按顺序选：⬆️ ➡️ ⬇️ ⬅️', tones: { [m.start]: 'path' }, emojis: emojisOf(m, m.start) });
  out.push(at('走过的地方撒面包屑 🍞，不走回头路', first));

  // 把行程切成「一口气往前走」和「退回」的段，往前走的段太长就再切开
  let k = 1;
  let goRuns = 0;
  let backRuns = 0;
  let afterBack = false;
  while (k < moves.length) {
    const kind = moves[k].kind === 'found' ? 'go' : moves[k].kind;
    let j = k;
    let n = 0;
    while (j < moves.length && (moves[j].kind === 'found' ? 'go' : moves[j].kind) === kind && !(kind === 'go' && n >= CHUNK)) {
      if (moves[j].kind !== 'found') n++;
      j++;
    }
    const last = moves[j - 1];
    if (kind === 'back') {
      backRuns++;
      out.push(at(backRuns === 1 ? '碰壁了，是死路！退回上一个路口' : '又是死路，再退回去', last));
      afterBack = true;
    } else {
      goRuns++;
      const found = last.kind === 'found';
      const say = found
        ? '💎 找到宝藏啦！'
        : afterBack ? '回到路口，换下一个方向' : goRuns === 1 ? '一直往前走，走到底' : '继续往前走';
      out.push(at(say, last));
      afterBack = false;
    }
    k = j;
  }

  const end = moves[moves.length - 1];
  const dfsSteps = end.path.length - 1;
  out.push(at('留在路上的 ' + dfsSteps + ' 步，就是它走出来的路', end));
  const best = shortestRoute(m);
  const bestTones: Record<number, Tone> = {};
  for (const id of best) bestTones[id] = 'best';
  out.push({
    say: '可是最近的路只要 ' + bestSteps(m) + ' 步，深度优先不保证最短',
    tones: pathTones(end, bestTones),
    emojis: emojisOf(m, m.end),
  });
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
    <Grid :w="maze.w" :h="maze.h" :walls="walls" :tones="f.tones" :emojis="f.emojis" />
    <div class="dots" aria-hidden="true">
      <span v-for="(_, i) in frames" :key="i" :class="{ on: i === k }" />
    </div>
    <div class="nav">
      <button type="button" class="big" :disabled="k === 0" aria-label="上一页" @click="prev">◀</button>
      <button type="button" class="big main" :aria-label="timer ? '暂停' : '自动播放'" @click="play">{{ timer ? '⏸' : '▶️' }}</button>
      <button type="button" class="big" :disabled="last" aria-label="下一页" @click="next">▶</button>
    </div>
    <div v-if="last" class="row">
      <button type="button" class="btn" @click="another">🧭 换个山洞再看一次</button>
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
