<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  BACK, DIR_ARROWS, DIR_NAMES, DIRS, PLAY_MAZES, around, exploreStars, expectedChoice, judgeChoice, parseMaze, type Choice,
} from '../../engine/dfs';
import Grid, { type Tone } from './Grid.vue';
import { emojisOf, wallsOf } from './view';

// 玩法一「下一步往哪走」：孩子替探险家选方向。规则是固定的：按 ①上 ②右 ③下 ④左 的顺序，
// 排在前面的方向只要能走就先走；四边都走不通，就退回上一个路口。
// 选了不对的方向：岩石和面包屑那边摇头，选了排后面的方向，就让该走的方向透出光；
// 没路了的时候，「退回」按钮会闪光，提示孩子退回去。
const which = ref(0);
const maze = computed(() => parseMaze(PLAY_MAZES[which.value]));
const walls = computed(() => wallsOf(maze.value));

const path = ref<number[]>([maze.value.start]);
const visited = ref<boolean[]>(fresh());
const misses = ref(0);
const steps = ref(0);
const backs = ref(0);
const done = ref(false);
const say = ref('');
const shake = ref<[number, number] | null>(null);
const padShake = ref<Choice | null>(null);
const padGlow = ref<Choice | null>(null);
const glowKey = ref(0);
const glow = ref<number[]>([]);
const timers: ReturnType<typeof setTimeout>[] = [];

function fresh(): boolean[] {
  const v = new Array<boolean>(maze.value.w * maze.value.h).fill(false);
  v[maze.value.start] = true;
  return v;
}

const cur = computed(() => path.value[path.value.length - 1]);
const stuck = computed(() => !done.value && expectedChoice(maze.value, visited.value, cur.value) === BACK);

function intro() {
  say.value = '👆 帮探险家 🧭 找宝藏 💎：按 ①②③④ 的顺序，哪边能走就走哪边';
}
intro();

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  visited.value.forEach((v, id) => {
    if (v) t[id] = 'crumb';
  });
  for (const id of path.value) t[id] = 'path';
  t[cur.value] = 'cur';
  return t;
});
const emojis = computed(() => emojisOf(maze.value, cur.value, visited.value));

function flash(kind: 'shake' | 'glow', c: Choice) {
  if (kind === 'shake') {
    padShake.value = null;
    requestAnimationFrame(() => (padShake.value = c));
    timers.push(setTimeout(() => (padShake.value = null), 600));
  } else {
    padGlow.value = null;
    requestAnimationFrame(() => (padGlow.value = c));
    timers.push(setTimeout(() => (padGlow.value = null), 1900));
  }
}

function choose(c: Choice) {
  if (done.value) return;
  const m = maze.value;
  const v = judgeChoice(m, visited.value, cur.value, c);
  const nb = c === BACK ? null : around(m, cur.value)[c];
  if (v.kind !== 'ok') {
    misses.value++;
    if (v.kind === 'wall') {
      say.value = nb === null ? '🧱 那边已经是洞外啦，换个方向' : '🧱 那边是岩石，过不去';
      flash('shake', c);
      if (nb !== null) shake.value = [nb, (shake.value?.[1] ?? 0) + 1];
    } else if (v.kind === 'crumb') {
      say.value = '🍞 那边有面包屑，来过啦，不走回头路';
      flash('shake', c);
      shake.value = [nb!, (shake.value?.[1] ?? 0) + 1];
    } else if (v.kind === 'skip') {
      say.value = '☝️ 能走是能走，可是排在前面的方向还没试呢';
      flash('shake', c);
      flash('glow', v.better as Choice);
      glow.value = [around(m, cur.value)[v.better]!];
      glowKey.value++;
    } else {
      say.value = '🔍 前面还有路可以走，不用退回';
      flash('shake', c);
      flash('glow', v.better as Choice);
      glow.value = [around(m, cur.value)[v.better]!];
      glowKey.value++;
    }
    return;
  }
  steps.value++;
  if (c === BACK) {
    backs.value++;
    path.value = path.value.slice(0, -1);
    const open = expectedChoice(m, visited.value, cur.value);
    say.value = open === BACK ? '↩️ 这个路口也没路了，再退一步' : '↩️ 退回到路口啦！换下一个方向试试';
    return;
  }
  const to = nb!;
  visited.value = visited.value.map((x, id) => x || id === to);
  path.value = [...path.value, to];
  if (to === m.end) {
    done.value = true;
    say.value = '🎉 找到宝藏啦！';
    return;
  }
  const next = expectedChoice(m, visited.value, to);
  say.value = next === BACK ? '🧱 死路！四边都走不通，怎么办？' : '🍞 撒下面包屑，继续';
}

const earned = computed(() => exploreStars(misses.value));

function again() {
  which.value = (which.value + 1) % PLAY_MAZES.length;
  path.value = [maze.value.start];
  visited.value = fresh();
  misses.value = 0;
  steps.value = 0;
  backs.value = 0;
  done.value = false;
  glow.value = [];
  intro();
}

onBeforeUnmount(() => timers.forEach(clearTimeout));

const PAD: { c: Choice; area: string }[] = [
  { c: 0, area: 'up' }, { c: 3, area: 'left' }, { c: 1, area: 'right' }, { c: 2, area: 'down' },
];
const ORDER = [1, 2, 3, 4]; // 方向 0～3 对应的顺序号：上右下左 = ①②③④
</script>

<template>
  <div class="game">
    <p class="say" aria-live="polite">{{ say }}</p>
    <div class="bar">
      <span class="count" aria-label="走了几步">👣 {{ steps }}</span>
      <span class="count" aria-label="退回了几次">↩️ {{ backs }}</span>
    </div>
    <Grid
      :w="maze.w" :h="maze.h" :walls="walls" :tones="tones" :emojis="emojis"
      :shake="shake" :glow="glow" :glow-key="glowKey"
    />
    <div v-if="!done" class="pad" role="group" aria-label="选方向">
      <button
        v-for="p in PAD" :key="p.c" type="button" class="key" :style="{ gridArea: p.area }"
        :class="{ shake: padShake === p.c, glow: padGlow === p.c }"
        :aria-label="'第 ' + ORDER[p.c] + ' 个试：' + DIR_NAMES[p.c]" @click="choose(p.c)"
      >
        <span class="arrow">{{ DIR_ARROWS[p.c] }}</span>
        <span class="ord" aria-hidden="true">{{ ORDER[p.c] }}</span>
      </button>
      <button
        type="button" class="key back" :class="{ shake: padShake === 4, hint: stuck }"
        style="grid-area: mid" aria-label="退回上一个路口" @click="choose(4)"
      >
        <span class="arrow">↩️</span>
      </button>
    </div>
    <p v-if="!done" class="small-note">① 上　② 右　③ 下　④ 左：先试 ①，不行再试 ②……四边都不行，就点 ↩️ 退回。</p>
    <div v-if="done" class="result">
      <p class="stars" :aria-label="earned + ' 颗星'">
        <span v-for="s in 3" :key="s" :class="{ dim: s > earned }">⭐</span>
      </p>
      <p>🧭 走了 {{ steps }} 步，其中退回 {{ backs }} 次。碰到死路就退回上一个路口、换下一个方向，这叫<b>回溯</b>。</p>
      <button type="button" class="btn primary" @click="again">🔁 换个山洞再来</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; gap: 14px; }
.say { font-size: clamp(1.2rem, 4.6vw, 1.7rem); min-height: 2.6em; }
.bar { display: flex; gap: 16px; }
.count { font: 600 1.2rem var(--mono); }
.pad {
  display: grid; gap: 8px; width: 210px; max-width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-areas: '. up .' 'left mid right' '. down .';
}
.key {
  font: inherit; position: relative; aspect-ratio: 1; cursor: pointer; display: grid; place-items: center;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg); padding: 0;
}
.key:hover { border-color: var(--accent); }
.key:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.arrow { font-size: clamp(1.3rem, 6vw, 1.9rem); line-height: 1; }
.ord {
  position: absolute; top: 3px; left: 5px; font: 700 12px var(--mono); color: var(--muted);
}
.key.back { background: var(--bg); }
.key.hint, .key.glow { animation: glow 0.9s ease-in-out infinite; }
.key.glow { animation-iteration-count: 2; }
.key.shake { animation: shake 0.5s ease-in-out; }
@keyframes glow {
  50% { box-shadow: 0 0 0 3px var(--mid), 0 0 14px 4px var(--mid); transform: scale(1.08); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-6deg); }
  40%, 80% { transform: translateX(4px) rotate(6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .key.hint, .key.glow, .key.shake { animation: none; }
  .key.hint, .key.glow { box-shadow: 0 0 0 3px var(--mid); }
}
.stars { font-size: 2.4rem; line-height: 1; }
.stars .dim { filter: grayscale(1); opacity: 0.3; }
</style>
