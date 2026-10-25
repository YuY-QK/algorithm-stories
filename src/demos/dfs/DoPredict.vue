<script setup lang="ts">
import { computed, ref } from 'vue';
import { coord, genPredict, parseMaze, rounds, colOf, rowOf, type Round } from '../../engine/dfs';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';
import Grid, { type Tone } from './Grid.vue';
import StackRow from './StackRow.vue';
import { emojisOf, wallsOf } from './view';

// 做：猜下一步。探险家站稳以后停住：
//   往前走 —— 直接点它要去的格子；
//   死路了 —— 点「回溯」，再点要退回到的路口（栈里离栈顶最近的、还有没试过方向的格子）；
//   就是宝藏 —— 点「return true」。
// 连对 5 次过关。
const GOAL = 5;

const maze = ref(parseMaze(genPredict()));
const list = ref<Round[]>(rounds(maze.value));
const r = ref(0);
const phase = ref<'ask' | 'backTo' | 'wrong' | 'end'>('ask');
const good = ref('');
const msg = ref('');
const { streak, passed, hit, miss } = useStreak(GOAL);
const shake = ref<[number, number] | null>(null);

function fresh() {
  maze.value = parseMaze(genPredict());
  list.value = rounds(maze.value);
  r.value = 0;
  phase.value = 'ask';
  good.value = '';
  msg.value = '';
}

const cur = computed(() => list.value[r.value]);
const walls = computed(() => wallsOf(maze.value));

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  const q = cur.value;
  q.visited.forEach((v, id) => {
    if (v) t[id] = 'crumb';
  });
  for (const id of q.path) t[id] = 'path';
  t[q.cur] = 'cur';
  return t;
});
const emojis = computed(() => emojisOf(maze.value, cur.value.cur, cur.value.visited));
const stack = computed<[number, number][]>(() => cur.value.path.map((id) => [rowOf(maze.value, id), colOf(maze.value, id)]));

function right(text: string) {
  hit();
  good.value = '✅ ' + text;
  advance();
}

function wrong() {
  miss();
  good.value = '';
  phase.value = 'wrong';
}

function advance() {
  msg.value = '';
  if (cur.value.answer.kind === 'end' || r.value >= list.value.length - 1) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'ask';
  }
}

function pick(id: number) {
  const q = cur.value;
  if (phase.value === 'ask') {
    if (q.answer.kind === 'go' && id === q.answer.to) right('走进 ' + coord(maze.value, id) + '，撒面包屑。');
    else if (id !== q.cur) wrong();
  } else if (phase.value === 'backTo') {
    if (!q.path.includes(id) || id === q.cur) {
      msg.value = '要点路上的格子（浅橙色），而且不是脚下这一个。';
      shake.value = [id, (shake.value?.[1] ?? 0) + 1];
      return;
    }
    const a = q.answer;
    if (a.kind === 'back' && a.to === id) right('退回 ' + coord(maze.value, id) + '，从它没试过的方向继续。');
    else wrong();
  }
}

function sayBack() {
  if (phase.value !== 'ask') return;
  const a = cur.value.answer;
  if (a.kind !== 'back') return wrong();
  if (a.to === null) {
    right('死路，而且所有路口都没新路了：搜索结束，返回 false。');
    return;
  }
  phase.value = 'backTo';
}

function sayEnd() {
  if (phase.value !== 'ask') return;
  if (cur.value.answer.kind === 'end') right('到宝藏了，return true。');
  else wrong();
}

const prompt = computed(() => {
  const q = cur.value;
  const here = coord(maze.value, q.cur);
  if (phase.value === 'end') return q.isEnd ? '走到宝藏，return true，一层层往回报喜讯。' : '搜索结束，返回 false。';
  if (phase.value === 'backTo') return '回溯：要一直退到哪个路口，那里还有没试过的方向？点那一格。';
  return '探险家刚走进 ' + here + '，撒了面包屑。接下来呢？往前走就点它要去的格子；四边都走不通就点「回溯」。';
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
      <span class="chip"><small>第</small>{{ r + 1 }} 次站稳</span>
    </template>
    <template #board>
      <Grid
        :w="maze.w" :h="maze.h" :walls="walls" :tones="tones" :emojis="emojis" coords
        :clickable="phase === 'ask' || phase === 'backTo'" :shake="shake" @pick="pick"
      />
      <StackRow :stack="stack" />
      <p v-if="good && phase !== 'wrong'" class="good">{{ good }}</p>
      <p v-if="msg" class="oops">{{ msg }}</p>
    </template>
    <template #answers>
      <div v-if="phase === 'ask'" class="answers">
        <button type="button" class="btn small primary" @click="sayBack">↩️ 死路了，回溯</button>
        <button type="button" class="btn small" @click="sayEnd">💎 是宝藏，return true</button>
      </div>
    </template>
  </PredictFrame>
</template>

<style scoped>
.good { color: var(--accent); font-size: 15px; }
</style>
