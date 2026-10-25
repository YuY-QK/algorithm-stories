<script setup lang="ts">
import { computed, ref } from 'vue';
import { CHALLENGE_ROOMS, challengeK, coord, genMaze, parseMaze, visitOrder } from '../../engine/dfs';
import Grid, { type Tone } from './Grid.vue';
import { emojisOf, wallsOf } from './view';

// 做：挑战。9×9 的山洞，同一个山洞里 DFS 和 BFS 访问格子的顺序完全不同。
// 题目：DFS（上右下左的顺序）第 k 个被标记 visited 的格子是哪一个？起点算第 1 个。
// 可以要一次提示（给出前一半），答完以后把 DFS 的前 k 个和 BFS 的第 k 个一起亮出来比。
const maze = ref(parseMaze(genMaze(CHALLENGE_ROOMS)));
const dfsOrder = computed(() => visitOrder(maze.value, 'dfs'));
const bfsOrder = computed(() => visitOrder(maze.value, 'bfs'));
const k = ref(challengeK());
const phase = ref<'ask' | 'right' | 'wrong'>('ask');
const hinted = ref(false);
const picked = ref<number | null>(null);
const shake = ref<[number, number] | null>(null);
const msg = ref('');
const wins = ref(0);

const hintCount = computed(() => Math.ceil((k.value - 1) / 2));
const target = computed(() => dfsOrder.value[k.value - 1]);
const bfsTarget = computed(() => bfsOrder.value[k.value - 1]);

function newQuestion(newMaze: boolean) {
  if (newMaze) maze.value = parseMaze(genMaze(CHALLENGE_ROOMS));
  k.value = challengeK();
  phase.value = 'ask';
  hinted.value = false;
  picked.value = null;
  msg.value = '';
}

function tap(id: number) {
  if (phase.value !== 'ask') return;
  if (wallsOf(maze.value)[id]) {
    shake.value = [id, (shake.value?.[1] ?? 0) + 1];
    msg.value = '那是岩石，探险家不会标记它。';
    return;
  }
  msg.value = '';
  picked.value = id;
  if (id === target.value) {
    phase.value = 'right';
    wins.value++;
  } else phase.value = 'wrong';
}

const shownCount = computed(() => (phase.value === 'ask' ? (hinted.value ? hintCount.value : 0) : k.value));

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  dfsOrder.value.slice(0, shownCount.value).forEach((id) => (t[id] = 'path'));
  if (phase.value !== 'ask') {
    t[bfsTarget.value] = 'nb';
    t[target.value] = 'best';
    if (picked.value !== null && picked.value !== target.value) t[picked.value] = 'miss';
  }
  return t;
});
const labels = computed(() => {
  const l: Record<number, number> = {};
  dfsOrder.value.slice(0, shownCount.value).forEach((id, i) => (l[id] = i + 1));
  return l;
});
const emojis = computed(() => emojisOf(maze.value, null));
</script>

<template>
  <div class="stage">
    <p>
      同一个山洞，DFS 和 BFS 走的顺序完全不同。DFS 按 上、右、下、左 的顺序，哪个格子是<b>第 {{ k }} 个</b>被标记 visited 的？起点算第 1 个。
    </p>
    <div class="vars">
      <span class="chip"><small>题目</small>DFS 第 {{ k }} 个</span>
      <span v-if="wins" class="chip"><small>答对</small>{{ wins }} 次</span>
    </div>
    <Grid
      :w="maze.w" :h="maze.h" :walls="wallsOf(maze)" :tones="tones" :labels="labels" :emojis="emojis"
      :clickable="phase === 'ask'" :shake="shake" @pick="tap"
    />
    <p class="oops" aria-live="polite">{{ msg }}</p>
    <div v-if="phase === 'ask'" class="row">
      <button type="button" class="btn small" :disabled="hinted" @click="hinted = true">
        💡 提示：给我看前 {{ hintCount }} 个
      </button>
    </div>
    <div v-if="phase === 'right'" class="result">
      <h3>🏅 对！DFS 的第 {{ k }} 个是 {{ coord(maze, target) }}</h3>
      <p>
        橙色是 DFS 的前 {{ k }} 个格子（一路钻深）。BFS 的第 {{ k }} 个是 {{ coord(maze, bfsTarget) }}（粗框），
        {{ bfsTarget === target ? '这次恰好是同一个。' : '和 DFS 完全不是一个地方：BFS 是一圈一圈往外扩的。' }}
      </p>
      <p class="small-note">到宝藏为止，DFS 标记了 {{ dfsOrder.length }} 个格子，BFS 标记了 {{ bfsOrder.length }} 个。</p>
      <div class="inline">
        <button type="button" class="btn small primary" @click="newQuestion(false)">同一个山洞，换一题</button>
        <button type="button" class="btn small" @click="newQuestion(true)">换个山洞</button>
      </div>
    </div>
    <div v-if="phase === 'wrong'" class="result">
      <h3>DFS 的第 {{ k }} 个是 {{ coord(maze, target) }}（绿色）</h3>
      <p>
        橙色是 DFS 的前 {{ k }} 个格子，数字是先后。{{ picked === bfsTarget ? '你点的是 BFS 的第 ' + k + ' 个（粗框）：BFS 一圈一圈扩，DFS 是一条路钻到底，次序完全不同。' : 'BFS 的第 ' + k + ' 个在粗框那里，和 DFS 不是同一个。' }}
        顺着数字走一遍：每到一格，先试上，再右、下、左，第一个没有面包屑的格子就是下一个。
      </p>
      <div class="inline">
        <button type="button" class="btn small primary" @click="newQuestion(false)">同一个山洞，换一题</button>
        <button type="button" class="btn small" @click="newQuestion(true)">换个山洞</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inline { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
