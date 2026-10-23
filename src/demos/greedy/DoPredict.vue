<script setup lang="ts">
import { computed, ref } from 'vue';
import { SYSTEMS, desc, rounds, type Round } from '../../engine/greedy';

// 做：猜下一步。每一轮先点出下一枚拿哪种面值，再选这种拿几枚。连对 5 次过关。
const GOAL = 5;

const coins = ref<number[]>([]);
const amount = ref(0);
const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'coin' | 'count' | 'wrong' | 'end'>('coin');
const picked = ref<number | null>(null);
const why = ref('');
const streak = ref(0);
const passed = ref(false);
const plate = ref<{ coin: number; count: number }[]>([]);
const options = ref<number[]>([]);

function fresh() {
  const sys = SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)];
  coins.value = desc(sys.coins);
  amount.value = 20 + Math.floor(Math.random() * 180);
  list.value = rounds(coins.value, amount.value);
  r.value = 0;
  plate.value = [];
  phase.value = 'coin';
  picked.value = null;
}
fresh();

const cur = computed(() => list.value[r.value]);
const left = computed(() => (phase.value === 'end' ? 0 : cur.value.left));

/** 拿几枚的四个选项：正确答案和它附近的数 */
function makeOptions(n: number): number[] {
  const set = new Set([n]);
  for (const d of [1, -1, 2, -2, 3]) {
    if (set.size >= 4) break;
    if (n + d >= 1) set.add(n + d);
  }
  return [...set].sort((a, b) => a - b);
}

function hit() {
  streak.value++;
  if (streak.value >= GOAL) passed.value = true;
}
function miss(text: string) {
  streak.value = 0;
  why.value = text;
  phase.value = 'wrong';
}

function tapCoin(c: number) {
  if (phase.value !== 'coin') return;
  picked.value = c;
  const { left: l, coin } = cur.value;
  if (c === coin) {
    hit();
    options.value = makeOptions(cur.value.count);
    phase.value = 'count';
  } else if (c > l) {
    miss(c + ' 比剩下的 ' + l + ' 大，拿了就找多了。不超过 ' + l + ' 的最大面值是 ' + coin + '。');
  } else {
    miss(c + ' 拿得下，但还有更大的 ' + coin + ' 也拿得下。贪心每次拿不超过 left 的最大面值。');
  }
}

function chooseCount(n: number) {
  if (phase.value !== 'count') return;
  const { left: l, coin, count } = cur.value;
  if (n === count) {
    hit();
    advance();
  } else {
    miss(l + ' ÷ ' + coin + ' = ' + count + ' 余 ' + (l - count * coin) + '：while 循环会一直拿 ' + coin + '，拿 ' + count + ' 枚后剩 ' + (l - count * coin) + '，比 ' + coin + ' 小才停。');
  }
}

function advance() {
  plate.value = [...plate.value, { coin: cur.value.coin, count: cur.value.count }];
  picked.value = null;
  if (r.value >= list.value.length - 1) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'coin';
  }
}

/** 答错后看完解释，按正确答案继续 */
function goOn() {
  if (picked.value !== null && picked.value !== cur.value.coin) {
    picked.value = cur.value.coin;
    options.value = makeOptions(cur.value.count);
    phase.value = 'count';
  } else advance();
}

const prompt = computed(() => {
  if (phase.value === 'end') return '找完了：一共 ' + plate.value.reduce((s, x) => s + x.count, 0) + ' 枚。';
  if (phase.value === 'coin') return 'left = ' + cur.value.left + '。下一枚拿哪种面值？点它。';
  if (phase.value === 'count') return 'left = ' + cur.value.left + '，c = ' + cur.value.coin + '。这种面值拿几枚？';
  return '';
});
</script>

<template>
  <div class="stage">
    <div class="vars">
      <span class="chip"><small>amount</small>{{ amount }}</span>
      <span class="chip"><small>left</small>{{ left }}</span>
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <div class="faces">
      <button
        v-for="c in coins"
        :key="c"
        type="button"
        class="face"
        :class="{
          right: (phase === 'count' || phase === 'wrong') && c === cur?.coin && picked === c,
          miss: phase === 'wrong' && c === picked && c !== cur.coin,
        }"
        :disabled="phase !== 'coin'"
        :aria-label="'面值 ' + c"
        @click="tapCoin(c)"
      >{{ c }}</button>
    </div>
    <div class="pan" aria-label="已经拿的硬币">
      <span class="pan-lab">picked</span>
      <span v-for="(x, k) in plate" :key="k" class="grp">{{ x.coin }} × {{ x.count }}</span>
    </div>
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <div v-if="phase === 'count'" class="answers">
      <button v-for="n in options" :key="n" type="button" class="btn small mono" @click="chooseCount(n)">{{ n }} 枚</button>
    </div>
    <div v-if="phase === 'wrong'" class="oops-box">
      <p>❌ {{ why }}</p>
      <button type="button" class="btn small" @click="goOn">知道了，继续</button>
    </div>
    <div v-if="phase === 'end'" class="row">
      <button type="button" class="btn small primary" @click="fresh">下一题</button>
    </div>
  </div>
</template>

<style scoped>
.faces { display: flex; flex-wrap: wrap; gap: 8px; }
.face {
  width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; padding: 0; cursor: pointer;
  font: 700 15px var(--mono); font-variant-numeric: tabular-nums;
  background: var(--bg); color: var(--fg); border: 1.5px solid var(--line);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.face:disabled { cursor: default; }
.face:not(:disabled):hover { border-color: var(--accent); }
.face:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.face.right { background: var(--mid); color: var(--mid-ink); border-color: var(--mid-ink); }
.face.miss { border-color: var(--warn); color: var(--warn); }
.pan {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 40px;
  padding: 6px 10px; border-radius: 10px; border: 1.5px dashed var(--line);
}
.pan-lab { font: 400 12px var(--mono); color: var(--muted); margin-right: 4px; }
.grp { font: 600 13px var(--mono); padding: 2px 8px; border-radius: 999px; background: var(--mid); color: var(--mid-ink); }
.mono { font-family: var(--mono); }
.win { border-color: var(--accent); color: var(--accent); }
.oops-box { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--warn); padding-left: 12px; }
</style>
