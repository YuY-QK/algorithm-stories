<script setup lang="ts">
import { computed, ref } from 'vue';
import { DIR_NAMES, L, coord, genMaze, parseMaze, rounds, type Round } from '../../engine/bfs';
import Maze, { type Tone } from './Maze.vue';
import QueueRow from './QueueRow.vue';

// 做：猜下一步。每次出队停住：队首的格子出队以后，哪些邻居会入队？点出来，或者判断它就是终点。连对 5 次过关。
const GOAL = 5;

const maze = ref(parseMaze(genMaze(4, 0.3)));
const list = ref<Round[]>(rounds(maze.value));
const r = ref(0);
const picked = ref<Set<number>>(new Set());
const phase = ref<'ask' | 'wrong' | 'end'>('ask');
const why = ref<string[]>([]);
const streak = ref(0);
const passed = ref(false);

function fresh() {
  maze.value = parseMaze(genMaze(4, 0.3));
  list.value = rounds(maze.value);
  r.value = 0;
  picked.value = new Set();
  phase.value = 'ask';
}

const cur = computed(() => list.value[r.value]);

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  const q = cur.value;
  q.visited.forEach((v, id) => {
    if (v) t[id] = 'old';
  });
  for (const id of q.queue) t[id] = 'queued';
  t[q.cur] = 'cur';
  if (phase.value === 'wrong') for (const id of q.pushed) t[id] = 'pick';
  else for (const id of picked.value) t[id] = 'pick';
  if (phase.value === 'wrong') for (const id of picked.value) if (!q.pushed.includes(id)) t[id] = 'miss';
  return t;
});
const labels = computed(() => {
  const l: Record<number, number> = {};
  cur.value.visited.forEach((v, id) => {
    if (v) l[id] = cur.value.dist[id];
  });
  return l;
});

function toggle(id: number) {
  if (phase.value !== 'ask' || id === cur.value.cur) return;
  const s = new Set(picked.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  picked.value = s;
}

function explain(q: Round): string[] {
  if (q.isEnd) return [coord(maze.value, q.cur) + ' 就是终点 E：第 ' + L.isEnd + ' 行直接返回 dist = ' + q.dist[q.cur] + '，不再看邻居。'];
  return q.checks.map((c) => {
    const name = DIR_NAMES[c.dir] + '边' + (c.id === null ? '' : ' ' + coord(maze.value, c.id));
    if (c.why === 'out') return name + '：出界，跳过。';
    if (c.why === 'wall') return name + '：墙，跳过。';
    if (c.why === 'seen') return name + '：已经 visited（它在队列里或者早就出过队），跳过。';
    return name + '：新格子，入队，dist = ' + (q.dist[q.cur] + 1) + '。';
  });
}

function judge(sayEnd: boolean) {
  if (phase.value !== 'ask') return;
  const q = cur.value;
  const ok = sayEnd
    ? q.isEnd
    : !q.isEnd && q.pushed.length === picked.value.size && q.pushed.every((id) => picked.value.has(id));
  if (ok) {
    streak.value++;
    if (streak.value >= GOAL) passed.value = true;
    advance();
  } else {
    streak.value = 0;
    why.value = explain(q);
    phase.value = 'wrong';
  }
}

function advance() {
  picked.value = new Set();
  if (cur.value.isEnd || r.value >= list.value.length - 1) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'ask';
  }
}

const prompt = computed(() => {
  const q = cur.value;
  if (phase.value === 'end') {
    return q.isEnd ? '走到奶酪，返回 ' + q.dist[q.cur] + '。' : '队列空了，返回 -1。';
  }
  return coord(maze.value, q.cur) + ' 出队，dist = ' + q.dist[q.cur] + '。它的邻居里哪些会入队？点出来再点「就这些」；一个也没有就直接点。';
});
</script>

<template>
  <div class="stage">
    <div class="vars">
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span class="chip"><small>第</small>{{ r + 1 }} 次出队</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <Maze :maze="maze" :tones="tones" :labels="labels" :mouse="maze.start" coords :clickable="phase === 'ask'" @pick="toggle" />
    <QueueRow :maze="maze" :queue="cur.queue" :dist="cur.dist" />
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <div v-if="phase === 'ask'" class="answers">
      <button type="button" class="btn small primary" @click="judge(false)">就这些（{{ picked.size }} 个）</button>
      <button type="button" class="btn small" @click="judge(true)">🧀 它是终点，return</button>
    </div>
    <div v-if="phase === 'wrong'" class="oops-box">
      <p>❌ 不对，四个方向逐个看：</p>
      <ul class="pits"><li v-for="(t, k) in why" :key="k">{{ t }}</li></ul>
      <button type="button" class="btn small" @click="advance">知道了，继续</button>
    </div>
    <div v-if="phase === 'end'" class="row">
      <button type="button" class="btn small primary" @click="fresh">换个迷宫</button>
    </div>
  </div>
</template>

<style scoped>
.win { border-color: var(--accent); color: var(--accent); }
.oops-box { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--warn); padding-left: 12px; }
</style>
