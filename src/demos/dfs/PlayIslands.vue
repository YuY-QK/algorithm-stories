<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  ISLAND_MAPS, exploreStars, floodFill, islandChoices, islands, isLand, judgeIslandTap, parseIslands,
} from '../../engine/dfs';
import Grid, { type Tone } from './Grid.vue';

// 玩法二「数一数小岛」：孩子点一块陆地，探险家用 DFS 把整座岛涂上颜色（洪水填充），
// 涂完所有的岛，再数一共有几座。点到海会摇头；点到涂过的岛，那座岛会透光。
// 涂一座岛的时候一格一格亮起来，顺序就是引擎里 floodFill 的访问顺序。
const which = ref(0);
const map = computed(() => parseIslands(ISLAND_MAPS[which.value]));
const all = computed(() => islands(map.value));

/** 已经涂好的岛，按点击的先后 */
const painted = ref<number[][]>([]);
/** 正在涂的岛，已经亮了几格 */
const filling = ref<{ cells: number[]; lit: number } | null>(null);
const misses = ref(0);
const phase = ref<'pick' | 'count' | 'won'>('pick');
const say = ref('');
const shake = ref<[number, number] | null>(null);
const glow = ref<number[]>([]);
const glowKey = ref(0);
const wrongNum = ref<number | null>(null);
const timers: ReturnType<typeof setTimeout>[] = [];

function intro() {
  say.value = '👆 点一块陆地，探险家 🧭 会把整座岛涂上颜色';
}
intro();

const coloredSet = computed(() => new Set(painted.value.flat()));

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  for (let id = 0; id < map.value.w * map.value.h; id++) t[id] = isLand(map.value, id) ? 'land' : 'sea';
  painted.value.forEach((isl, k) => isl.forEach((id) => (t[id] = ('i' + (k % 4)) as Tone)));
  const f = filling.value;
  if (f) {
    const k = painted.value.length;
    f.cells.slice(0, f.lit).forEach((id) => (t[id] = ('i' + (k % 4)) as Tone));
  }
  return t;
});
const emojis = computed(() => {
  const e: Record<number, string> = {};
  const f = filling.value;
  if (f && f.lit > 0 && f.lit <= f.cells.length) e[f.cells[f.lit - 1]] = '🧭';
  return e;
});
const labels = computed(() => {
  const l: Record<number, number> = {};
  painted.value.forEach((isl, k) => (l[isl[0]] = k + 1));
  return l;
});

function tap(id: number) {
  if (phase.value !== 'pick' || filling.value) return;
  const j = judgeIslandTap(map.value, coloredSet.value, id);
  if (j === 'sea') {
    misses.value++;
    shake.value = [id, (shake.value?.[1] ?? 0) + 1];
    say.value = '🌊 这是海，找灰色的陆地 🏝️';
    return;
  }
  if (j === 'done') {
    glow.value = painted.value.find((isl) => isl.includes(id))!;
    glowKey.value++;
    say.value = '👀 这座岛已经涂过颜色啦，数过的不用再数';
    return;
  }
  const cells = floodFill(map.value, id);
  say.value = '🧭 探险家一格一格走，把连着的陆地都涂上';
  filling.value = { cells, lit: 0 };
  cells.forEach((_, k) => {
    timers.push(setTimeout(() => {
      if (filling.value) filling.value.lit = k + 1;
    }, 160 * (k + 1)));
  });
  timers.push(setTimeout(() => {
    painted.value = [...painted.value, cells];
    filling.value = null;
    if (painted.value.length === all.value.length) {
      phase.value = 'count';
      say.value = '🏝️ 所有的岛都涂好啦！一共有几座岛？';
    } else {
      say.value = '✨ 这座岛涂好了！还有灰色的陆地';
    }
  }, 160 * cells.length + 350));
}

const choices = computed(() => islandChoices(all.value.length));

function answer(n: number) {
  if (phase.value !== 'count') return;
  if (n === all.value.length) {
    phase.value = 'won';
    say.value = '🎉 对啦！一共 ' + n + ' 座岛';
    return;
  }
  misses.value++;
  wrongNum.value = null;
  requestAnimationFrame(() => (wrongNum.value = n));
  timers.push(setTimeout(() => (wrongNum.value = null), 600));
  say.value = '🤔 数数有几种颜色？每种颜色是一座岛';
}

const earned = computed(() => exploreStars(misses.value));

function again() {
  timers.forEach(clearTimeout);
  timers.length = 0;
  which.value = (which.value + 1) % ISLAND_MAPS.length;
  painted.value = [];
  filling.value = null;
  misses.value = 0;
  phase.value = 'pick';
  glow.value = [];
  intro();
}

onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>

<template>
  <div class="game">
    <p class="say" aria-live="polite">{{ say }}</p>
    <Grid
      :w="map.w" :h="map.h" :tones="tones" :emojis="emojis" :labels="labels"
      :clickable="phase === 'pick' && !filling" :shake="shake" :glow="glow" :glow-key="glowKey" @pick="tap"
    />
    <div v-if="phase === 'count'" class="answers" role="group" aria-label="一共几座岛">
      <button
        v-for="n in choices" :key="n" type="button" class="num-btn" :class="{ wrong: wrongNum === n }"
        :aria-label="n + ' 座岛'" @click="answer(n)"
      >{{ n }}</button>
    </div>
    <div v-if="phase === 'won'" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>每点一块陆地，探险家就沿着陆地一直走、走不通就退回来，把连在一起的陆地全涂上。这就是<b>深度优先搜索</b>。</p>
      <button type="button" class="btn primary" @click="again">🏝️ 换一张海图再来</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; }
.say { font-size: clamp(1.2rem, 4.6vw, 1.7rem); min-height: 2.6em; }
.answers { display: flex; gap: 12px; }
.num-btn {
  font: 700 1.8rem var(--mono); width: 3.2rem; height: 3.2rem; cursor: pointer;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.num-btn:hover { border-color: var(--accent); }
.num-btn:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.num-btn.wrong { animation: shake 0.5s ease-in-out; }
@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-6deg); }
  40%, 80% { transform: translateX(4px) rotate(6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .num-btn.wrong { animation: none; border-color: var(--warn); }
}
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
</style>
