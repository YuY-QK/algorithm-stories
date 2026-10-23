<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_MAZES, applyDrawTap, judgeDrawTap, parseMaze, pathTo, routeStars, waves } from '../../engine/bfs';
import Maze, { type Tone } from './Maze.vue';

// 玩法二「抄近路」：孩子一格一格点出小老鼠的路，到奶酪后和水波找到的最短路比一比。
// 一步只能走一格（隔得远的格子会摇头），点回路上的格子就退回去。
// 走远了不说错，只亮出水波的路让孩子比；再走一次时可以打开水波数字，顺着 1、2、3 走。
const which = ref(1);
const maze = computed(() => parseMaze(KID_MAZES[which.value]));
const wv = computed(() => waves(maze.value, false));
const best = computed(() => wv.value.dist[maze.value.end]);

const path = ref<number[]>([maze.value.start]);
const done = ref(false);
const numbers = ref(false);
const shake = ref<[number, number] | null>(null);
const say = ref('👆 帮小老鼠 🐭 点出去奶酪 🧀 的路，一次走一格');

const steps = computed(() => path.value.length - 1);
const earned = computed(() => routeStars(steps.value, best.value));
const bfsPath = computed(() => pathTo(wv.value, maze.value.end));

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  if (numbers.value) {
    wv.value.dist.forEach((d, id) => {
      if (d > 0) t[id] = 'old';
    });
  }
  if (done.value && steps.value > best.value) for (const id of bfsPath.value) t[id] = 'path';
  for (const id of path.value.slice(1)) t[id] = 'mine';
  return t;
});
const labels = computed(() => {
  const l: Record<number, number> = {};
  if (numbers.value) {
    wv.value.dist.forEach((d, id) => {
      if (d > 0) l[id] = d;
    });
  } else {
    path.value.slice(1).forEach((id, k) => (l[id] = k + 1));
  }
  return l;
});

function tap(id: number) {
  if (done.value) return;
  const j = judgeDrawTap(maze.value, path.value, id);
  if (j === 'wall' || j === 'far') {
    shake.value = [id, (shake.value?.[1] ?? 0) + 1];
    say.value = j === 'wall' ? '🧱 墙过不去哦' : '👣 一次只能走一格，要挨着 🐭';
    return;
  }
  path.value = applyDrawTap(maze.value, path.value, id);
  if (j === 'back') {
    say.value = '↩️ 退回来啦';
    return;
  }
  if (id === maze.value.end) {
    done.value = true;
    say.value = steps.value <= best.value
      ? '🎉 ' + steps.value + ' 步！和水波一样近，这就是最短的路'
      : '🧀 吃到啦！你走了 ' + steps.value + ' 步，水波 🌊 只要 ' + best.value + ' 步';
    return;
  }
  say.value = '👣 ' + steps.value;
}

function undo() {
  if (done.value || path.value.length < 2) return;
  path.value = path.value.slice(0, -1);
}

function retry(withNumbers: boolean) {
  numbers.value = withNumbers;
  path.value = [maze.value.start];
  done.value = false;
  say.value = withNumbers ? '🌊 跟着数字 1、2、3……走，每步都比上一格多 1' : '👆 再走一次，这回能更近吗？';
}

function next() {
  which.value = (which.value + 1) % KID_MAZES.length;
  retry(false);
  say.value = '👆 新迷宫！点出去奶酪 🧀 的路';
}
</script>

<template>
  <div class="game">
    <p class="say" aria-live="polite">{{ say }}</p>
    <div class="bar">
      <span class="count" aria-label="已经走了几步">👣 {{ steps }}</span>
      <button type="button" class="btn small" :disabled="done || path.length < 2" aria-label="退一步" @click="undo">↩️</button>
    </div>
    <Maze
      :maze="maze" :tones="tones" :labels="labels" :mouse="path[path.length - 1]"
      :clickable="!done" :shake="shake" @pick="tap"
    />
    <div v-if="done" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p v-if="steps > best">绿色是水波找到的路。🤔 哪里绕远了？</p>
      <div class="row">
        <template v-if="steps > best">
          <button type="button" class="btn primary" @click="retry(false)">🔁 再走一次</button>
          <button type="button" class="btn" @click="retry(true)">🌊 带着水波数字走</button>
        </template>
        <button v-else type="button" class="btn primary" @click="next">🧀 换个迷宫</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; }
.say { font-size: clamp(1.2rem, 4.6vw, 1.7rem); min-height: 2.6em; }
.bar { display: flex; align-items: center; gap: 12px; }
.count { font: 600 1.2rem var(--mono); min-width: 3.5em; }
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
</style>
