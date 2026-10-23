<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { rounds, valueOptions, type Round } from '../../engine/dynamic-programming';
import DpRow from './DpRow.vue';

// 做：猜下一步。每一格先点出「它从哪两格来」，再选它的值。连对 5 次过关。
const GOAL = 5;

const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'from' | 'value' | 'wrong' | 'filled' | 'end'>('from');
const picked = ref<number[]>([]);
const miss = ref<number | null>(null);
const why = ref('');
const streak = ref(0);
const passed = ref(false);
let afterWrong: 'from' | 'value' = 'from';
let timer: ReturnType<typeof setTimeout> | null = null;
onBeforeUnmount(() => timer && clearTimeout(timer));

function fresh() {
  list.value = rounds(6 + Math.floor(Math.random() * 5));
  r.value = 0;
  phase.value = 'from';
  picked.value = [];
  miss.value = null;
}
fresh();

const cur = computed(() => list.value[r.value]);
const options = computed(() => valueOptions(cur.value));
const view = computed(() => {
  const c = cur.value;
  if (phase.value === 'filled' || phase.value === 'end') return c.dp.map((v, k) => (k === c.i ? c.value : v));
  return c.dp;
});

function hit() {
  streak.value++;
  if (streak.value >= GOAL) passed.value = true;
}
function bad(text: string, then: 'from' | 'value') {
  streak.value = 0;
  why.value = text;
  afterWrong = then;
  phase.value = 'wrong';
}

function tapCell(k: number) {
  if (phase.value !== 'from') return;
  const c = cur.value;
  if (c.from.includes(k)) {
    if (!picked.value.includes(k)) picked.value = [...picked.value, k];
    if (picked.value.length === 2) {
      hit();
      phase.value = 'value';
    }
    return;
  }
  miss.value = k;
  bad(
    c.dp[k] === null
      ? 'dp[' + k + '] 还空着，只能用已经填好的格子。'
      : 'dp[' + c.i + '] 的最后一步，要么从第 ' + (c.i - 1) + ' 级跳 1 级上来，要么从第 ' + (c.i - 2) + ' 级跳 2 级上来，所以只看紧挨着的前两格：dp[' + (c.i - 1) + '] 和 dp[' + (c.i - 2) + ']。',
    'from',
  );
}

function chooseValue(v: number) {
  if (phase.value !== 'value') return;
  const c = cur.value;
  if (v === c.value) {
    hit();
    phase.value = 'filled';
    timer = setTimeout(advance, 900);
  } else {
    bad('dp[' + c.i + '] = dp[' + (c.i - 1) + '] + dp[' + (c.i - 2) + '] = ' + c.dp[c.i - 1] + ' + ' + c.dp[c.i - 2] + ' = ' + c.value + '。两格都要加上，一格也不能少。', 'value');
  }
}

function advance() {
  picked.value = [];
  miss.value = null;
  if (r.value >= list.value.length - 1) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'from';
  }
}

function goOn() {
  miss.value = null;
  if (afterWrong === 'from') {
    picked.value = [...cur.value.from];
    phase.value = 'value';
  } else {
    phase.value = 'filled';
    timer = setTimeout(advance, 400);
  }
}

const prompt = computed(() => {
  const c = cur.value;
  if (phase.value === 'end') return '填完了，dp[' + c.i + '] = ' + c.value + '，到第 ' + c.i + ' 级有 ' + c.value + ' 种跳法。';
  if (phase.value === 'filled') return '✅ dp[' + c.i + '] = ' + c.dp[c.i - 1] + ' + ' + c.dp[c.i - 2] + ' = ' + c.value;
  if (phase.value === 'value') return 'dp[' + c.i + '] = dp[' + (c.i - 1) + '] + dp[' + (c.i - 2) + '] = ' + c.dp[c.i - 1] + ' + ' + c.dp[c.i - 2] + ' = ？';
  return '轮到 dp[' + c.i + ']。它是从哪两格来的？点出这两格。';
});
</script>

<template>
  <div class="stage">
    <div class="vars">
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <DpRow :dp="view" :cur="cur.i" :picked="picked" :miss="phase === 'wrong' ? miss : null" :fresh="phase === 'filled' || phase === 'end' ? cur.i : null" :clickable="phase === 'from'" @pick="tapCell" />
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <div v-if="phase === 'value'" class="answers">
      <button v-for="o in options" :key="o" type="button" class="btn small mono" @click="chooseValue(o)">{{ o }}</button>
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
.mono { font-family: var(--mono); }
.win { border-color: var(--accent); color: var(--accent); }
.oops-box { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--warn); padding-left: 12px; }
</style>
