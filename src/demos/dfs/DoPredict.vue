<script setup lang="ts">
import { computed, ref } from 'vue';
import { DIR_NAMES, coord, genMaze, parseMaze, rounds, colOf, rowOf, type Round } from '../../engine/dfs';
import Grid, { type Tone } from './Grid.vue';
import StackRow from './StackRow.vue';
import { emojisOf, wallsOf } from './view';

// 做：猜下一步。探险家站稳以后停住：
//   往前走 —— 直接点它要去的格子；
//   死路了 —— 点「回溯」，再点要退回到的路口（栈里离栈顶最近的、还有没试过方向的格子）；
//   就是宝藏 —— 点「return true」。
// 连对 5 次过关。
const GOAL = 5;

const maze = ref(parseMaze(genMaze(4, 0.3)));
const list = ref<Round[]>(rounds(maze.value));
const r = ref(0);
const phase = ref<'ask' | 'backTo' | 'wrong' | 'end'>('ask');
const why = ref<string[]>([]);
const good = ref('');
const msg = ref('');
const streak = ref(0);
const passed = ref(false);
const shake = ref<[number, number] | null>(null);

function fresh() {
  maze.value = parseMaze(genMaze(4, 0.3));
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

function explain(q: Round): string[] {
  const m = maze.value;
  if (q.answer.kind === 'end') return [coord(m, q.cur) + ' 就是宝藏 E：第 13 行直接 return true，不用再往下走。'];
  const out: string[] = [];
  for (const c of q.checks) {
    const name = DIR_NAMES[c.dir] + '边' + (c.id === null ? '' : ' ' + coord(m, c.id));
    if (c.why === 'out') out.push(name + '：出界，return false。');
    else if (c.why === 'wall') out.push(name + '：岩石，return false。');
    else if (c.why === 'seen') out.push(name + '：已经有面包屑，return false。');
    else {
      out.push(name + '：新格子，进去！' + (q.answer.kind === 'go' ? '后面的方向这一轮不用看了。' : ''));
      break;
    }
  }
  if (q.answer.kind === 'back') {
    out.push(
      q.answer.to === null
        ? '四个方向都走不通，往回退，栈里每个路口也都没有新路了：一路退到起点，dfs 返回 false。'
        : '四个方向都走不通，这一层 return false，退回上一层；一直退到 ' + coord(m, q.answer.to) + '，它还有没试过的方向，从那里继续。',
    );
  }
  return out;
}

function right(text: string) {
  streak.value++;
  if (streak.value >= GOAL) passed.value = true;
  good.value = '✅ ' + text;
  advance();
}

function wrong() {
  streak.value = 0;
  good.value = '';
  why.value = explain(cur.value);
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
  <div class="stage">
    <div class="vars">
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span class="chip"><small>第</small>{{ r + 1 }} 次站稳</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <Grid
      :w="maze.w" :h="maze.h" :walls="walls" :tones="tones" :emojis="emojis" coords
      :clickable="phase === 'ask' || phase === 'backTo'" :shake="shake" @pick="pick"
    />
    <StackRow :stack="stack" />
    <p v-if="good && phase !== 'wrong'" class="good">{{ good }}</p>
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <p v-if="msg" class="oops">{{ msg }}</p>
    <div v-if="phase === 'ask'" class="answers">
      <button type="button" class="btn small primary" @click="sayBack">↩️ 死路了，回溯</button>
      <button type="button" class="btn small" @click="sayEnd">💎 是宝藏，return true</button>
    </div>
    <div v-if="phase === 'wrong'" class="oops-box">
      <p>❌ 不对，按 上、右、下、左 的顺序看：</p>
      <ul class="pits"><li v-for="(t, k) in why" :key="k">{{ t }}</li></ul>
      <button type="button" class="btn small" @click="advance">知道了，继续</button>
    </div>
    <div v-if="phase === 'end'" class="row">
      <button type="button" class="btn small primary" @click="fresh">换个山洞</button>
    </div>
  </div>
</template>

<style scoped>
.win { border-color: var(--accent); color: var(--accent); }
.good { color: var(--accent); font-size: 15px; }
.oops-box { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--warn); padding-left: 12px; }
</style>
