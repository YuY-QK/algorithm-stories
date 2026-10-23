<script setup lang="ts">
import { computed, ref } from 'vue';
import { CHALLENGE_ROOMS, applyDrawTap, genMaze, judgeDrawTap, parseMaze, pathTo, waves } from '../../engine/bfs';
import Maze, { type Tone } from './Maze.vue';

// 做：挑战。11×11 的迷宫，不看水波，自己点出一条路；步数和 BFS 的最短路一样就过关。
const maze = ref(parseMaze(genMaze(CHALLENGE_ROOMS)));
const wv = computed(() => waves(maze.value));
const best = computed(() => wv.value.dist[maze.value.end]);
const path = ref<number[]>([maze.value.start]);
const state = ref<'play' | 'win' | 'lose'>('play');
const shake = ref<[number, number] | null>(null);
const msg = ref('');
const wins = ref(0);

const steps = computed(() => path.value.length - 1);

function fresh() {
  maze.value = parseMaze(genMaze(CHALLENGE_ROOMS));
  path.value = [maze.value.start];
  state.value = 'play';
  msg.value = '';
}

function tap(id: number) {
  if (state.value !== 'play') return;
  const j = judgeDrawTap(maze.value, path.value, id);
  if (j === 'wall' || j === 'far') {
    shake.value = [id, (shake.value?.[1] ?? 0) + 1];
    msg.value = j === 'wall' ? '那是墙。' : '一次只能走到和路的末端挨着的格子。';
    return;
  }
  msg.value = '';
  path.value = applyDrawTap(maze.value, path.value, id);
  if (id === maze.value.end) {
    if (steps.value <= best.value) {
      state.value = 'win';
      wins.value++;
    } else state.value = 'lose';
  }
}

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  if (state.value !== 'play') for (const id of pathTo(wv.value, maze.value.end)) t[id] = 'best';
  for (const id of path.value.slice(1)) t[id] = 'mine';
  return t;
});
</script>

<template>
  <div class="stage">
    <p>从左上角的 🐭 出发，一格一格点到右下角的 🧀。点回路上的格子可以退回去。没有水波数字，全凭眼力：和 BFS 的最短路一样短就过关。</p>
    <div class="vars">
      <span class="chip"><small>你的步数</small>{{ steps }}</span>
      <span v-if="state !== 'play'" class="chip"><small>BFS 最短</small>{{ best }}</span>
      <span v-if="wins" class="chip"><small>过关</small>{{ wins }} 次</span>
    </div>
    <Maze :maze="maze" :tones="tones" :mouse="path[path.length - 1]" :clickable="state === 'play'" :shake="shake" @pick="tap" />
    <p class="oops" aria-live="polite">{{ msg }}</p>
    <div v-if="state === 'win'" class="result">
      <h3>🏅 {{ steps }} 步，和 BFS 一样短，挑战成功！</h3>
      <p>迷宫里有好几条绕圈的岔路，眼睛找最短路很容易漏看；BFS 一圈一圈地扫，第一次碰到奶酪就一定是最短。</p>
      <button type="button" class="btn small" @click="fresh">再来一局</button>
    </div>
    <div v-if="state === 'lose'" class="result">
      <h3>你走了 {{ steps }} 步，BFS 只要 {{ best }} 步。</h3>
      <p>绿色是 BFS 找到的最短路，橙色是你的路。看看哪里绕远了？</p>
      <div class="inline">
        <button type="button" class="btn small" @click="path = [maze.start]; state = 'play'">同一个迷宫再走一次</button>
        <button type="button" class="btn small" @click="fresh">换个迷宫</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inline { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
