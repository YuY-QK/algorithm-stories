<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_MAZES, judgeRingTap, parseMaze, pathTo, ringStars, waves } from '../../engine/bfs';
import Maze, { type Tone } from './Maze.vue';

// 玩法一「下一圈」：孩子当水波，一圈一圈涂出小老鼠走 k 步能到的格子。
// 每一圈有几格是固定的（下面的小圆点），点错时格子摇头；点到太远的格子，上一圈的格子会透光，
// 提示「要挨着它们」。碰到奶酪就倒着走回去，亮出最短路。
const which = ref(0);
const maze = computed(() => parseMaze(KID_MAZES[which.value]));
const wv = computed(() => waves(maze.value));

const ring = ref(1);
const painted = ref<Set<number>>(new Set());
const misses = ref(0);
const done = ref(false);
const shake = ref<[number, number] | null>(null);
const glowKey = ref(0);
const say = ref('');

function intro() {
  say.value = '👆 小老鼠走 1 步能到哪？把格子点亮';
}
intro();

const cells = computed(() => wv.value.rings[ring.value] ?? []);
const path = computed(() => (done.value ? pathTo(wv.value, maze.value.end) : []));

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  const m = maze.value;
  for (let k = 0; k < ring.value; k++) for (const id of wv.value.rings[k]) t[id] = 'old';
  for (const id of painted.value) t[id] = 'ring';
  for (const id of path.value) t[id] = 'path';
  if (!done.value) t[m.start] = 'old';
  return t;
});
const labels = computed(() => {
  const l: Record<number, number> = {};
  for (let k = 0; k < ring.value; k++) for (const id of wv.value.rings[k]) l[id] = k;
  for (const id of painted.value) l[id] = ring.value;
  return l;
});

function tap(id: number) {
  if (done.value) return;
  const j = judgeRingTap(maze.value, wv.value.dist, ring.value, painted.value, id);
  if (j === 'wall' || j === 'painted' || j === 'far') {
    shake.value = [id, (shake.value?.[1] ?? 0) + 1];
    if (j === 'painted') {
      say.value = '👀 这一格已经亮过啦，找这一圈还没亮的格子';
      return;
    }
    misses.value++;
    if (j === 'wall') say.value = '🧱 这格是墙，小老鼠过不去，换一格';
    else {
      say.value = '🤔 太远啦！要挨着亮着 ' + (ring.value - 1) + ' 的格子';
      glowKey.value++;
    }
    return;
  }
  painted.value = new Set([...painted.value, id]);
  if (j === 'cheese') {
    done.value = true;
    say.value = '🎉 第 ' + ring.value + ' 圈找到奶酪！倒着走回去，这就是最短的路';
    return;
  }
  if (painted.value.size === cells.value.length) {
    ring.value++;
    painted.value = new Set();
    say.value = '🌊 第 ' + (ring.value - 1) + ' 圈涂好啦！再走 1 步能到哪？';
  } else {
    say.value = '✨ 亮了 ' + painted.value.size + ' 格，这一圈一共 ' + cells.value.length + ' 格，还有呢？';
  }
}

const glow = computed(() => wv.value.rings[ring.value - 1] ?? []);
const earned = computed(() => ringStars(misses.value));

function again() {
  which.value = (which.value + 1) % KID_MAZES.length;
  ring.value = 1;
  painted.value = new Set();
  misses.value = 0;
  done.value = false;
  intro();
}
</script>

<template>
  <div class="game">
    <p class="small-note">目标：小老鼠 🐭 像水波一样一圈一圈往外找奶酪。先点亮走 1 步能到的格子，再点亮走 2 步能到的……下面的小圆点是这一圈一共有几格，碰到奶酪就成功。点错了格子会摇头，太远了会提示要挨着上一圈。</p>
    <p class="say" aria-live="polite">{{ say }}</p>
    <div v-if="!done" class="left" :aria-label="'这一圈有 ' + cells.length + ' 格，还剩 ' + (cells.length - painted.size) + ' 格'">
      <span class="wave" aria-hidden="true">🌊 {{ ring }}</span>
      <span v-for="(_, k) in cells" :key="k" class="dot" :class="{ lit: k < painted.size }" aria-hidden="true" />
    </div>
    <Maze
      :maze="maze" :tones="tones" :labels="labels" :mouse="done ? maze.end : maze.start"
      :clickable="!done" :shake="shake" :glow="glow" :glow-key="glowKey" @pick="tap"
    />
    <div v-if="done" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>🐭 {{ ring }} 步就到！一圈一圈找，最先碰到奶酪的那一圈，就是最近的。</p>
      <button type="button" class="btn primary" @click="again">🔁 换个迷宫再来</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; }
.say { font-size: clamp(1.2rem, 4.6vw, 1.7rem); min-height: 2.6em; }
.left { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 1.6em; }
.wave { font: 600 1rem var(--mono); margin-right: 4px; }
.dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--mid); }
.dot.lit { background: var(--mid); }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
</style>
