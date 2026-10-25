<script setup lang="ts">
import { computed, ref } from 'vue';
import { genPredict, rounds, whyCoin, type Round } from '../../engine/greedy';
import PredictFrame from '../../components/shared/PredictFrame.vue';
import { useStreak } from '../../components/shared/useStreak';

// 做：猜下一步。每一轮先点出下一枚拿哪种面值，再选这种拿几枚。连对 5 次过关。
const GOAL = 5;

const coins = ref<number[]>([]);
const amount = ref(0);
const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'coin' | 'count' | 'wrong' | 'end'>('coin');
const picked = ref<number | null>(null);
const why = ref('');
const { streak, passed, hit, miss } = useStreak(GOAL);
const plate = ref<{ coin: number; count: number }[]>([]);

function fresh() {
  const q = genPredict();
  coins.value = q.coins;
  amount.value = q.amount;
  list.value = rounds(q.coins, q.amount);
  r.value = 0;
  plate.value = [];
  phase.value = 'coin';
  picked.value = null;
}
fresh();

const cur = computed(() => list.value[r.value]);
const left = computed(() => (phase.value === 'end' ? 0 : cur.value.left));

function wrong(text: string) {
  miss();
  why.value = text;
  phase.value = 'wrong';
}

function tapCoin(c: number) {
  if (phase.value !== 'coin') return;
  picked.value = c;
  if (c === cur.value.coin) {
    hit();
    phase.value = 'count';
  } else wrong(whyCoin(cur.value, c));
}

function chooseCount(n: number) {
  if (phase.value !== 'count') return;
  if (n === cur.value.count) {
    hit();
    advance();
  } else wrong(cur.value.why);
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
  <PredictFrame
    :streak="streak"
    :goal="GOAL"
    :passed="passed"
    :prompt="prompt"
    :wrong="phase === 'wrong' ? why : null"
    :ended="phase === 'end'"
    @continue="goOn"
    @next="fresh"
  >
    <template #chips>
      <span class="chip"><small>amount</small>{{ amount }}</span>
      <span class="chip"><small>left</small>{{ left }}</span>
    </template>
    <template #board>
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
    </template>
    <template #answers>
      <div v-if="phase === 'count'" class="answers">
        <button v-for="n in cur.options" :key="n" type="button" class="btn small mono" @click="chooseCount(n)">{{ n }} 枚</button>
      </div>
    </template>
  </PredictFrame>
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
</style>
