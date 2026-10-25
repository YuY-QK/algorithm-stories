<script setup lang="ts">
import { computed, ref } from 'vue';
import { coord, genPredict, parseMaze, rounds, type Round } from '../../engine/bfs';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import Maze, { type Tone } from './Maze.vue';
import QueueRow from './QueueRow.vue';

// 做：猜下一步。每次出队停住：队首的格子出队以后，哪些邻居会入队？点出来，或者判断它就是终点。连对 5 次过关。
const GOAL = 5;

const maze = ref(parseMaze(genPredict()));
const list = ref<Round[]>(rounds(maze.value));
const r = ref(0);
const picked = ref<Set<number>>(new Set());
const phase = ref<'ask' | 'wrong' | 'end'>('ask');
const { streak, passed, hit, miss } = useStreak(GOAL);

function fresh() {
  maze.value = parseMaze(genPredict());
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

function judge(sayEnd: boolean) {
  if (phase.value !== 'ask') return;
  const q = cur.value;
  const ok = sayEnd
    ? q.isEnd
    : !q.isEnd && q.pushed.length === picked.value.size && q.pushed.every((id) => picked.value.has(id));
  if (ok) {
    hit();
    advance();
  } else {
    miss();
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
  <PredictFrame
    :streak="streak"
    :goal="GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="phase === 'wrong' ? cur.why : null"
    :ended="phase === 'end'"
    @continue="advance"
    @next="fresh"
  >
    <template #chips>
      <span class="chip"><small>第</small>{{ r + 1 }} 次出队</span>
    </template>
    <template #board>
      <Maze :maze="maze" :tones="tones" :labels="labels" :mouse="maze.start" coords :clickable="phase === 'ask'" @pick="toggle" />
      <QueueRow :maze="maze" :queue="cur.queue" :dist="cur.dist" />
    </template>
    <template #answers>
      <div v-if="phase === 'ask'" class="answers">
        <button type="button" class="btn small primary" @click="judge(false)">就这些（{{ picked.size }} 个）</button>
        <button type="button" class="btn small" @click="judge(true)">🧀 它是终点，return</button>
      </div>
    </template>
  </PredictFrame>
</template>
