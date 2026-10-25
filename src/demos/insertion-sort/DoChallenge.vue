<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { CHALLENGE_N, LANE_NAME, buildTrace, genChallenge, type RaceLane } from '../../engine/insertion-sort';
import { useStageStop } from '../../components/shared/usePlayer';
import { RACE_STRIDE, RACE_TICK } from '../../components/shared/timing';

// 做：挑战。四组数组同时跑插入排序，先预测谁最快、谁最慢，再开跑，和实际的挪动次数比一比。
const LETTERS = ['A', 'B', 'C', 'D'];
const lanes = ref<RaceLane[]>([]);
const traces = computed(() => lanes.value.map((l) => buildTrace(l.values)));
const fast = ref<number | null>(null);
const slow = ref<number | null>(null);
const phase = ref<'fast' | 'slow' | 'ready' | 'race' | 'end'>('fast');
const t = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}
function fresh() {
  stop();
  lanes.value = genChallenge();
  fast.value = null;
  slow.value = null;
  phase.value = 'fast';
  t.value = 0;
}
fresh();

function choose(k: number) {
  if (phase.value === 'fast') {
    fast.value = k;
    phase.value = 'slow';
  } else if (phase.value === 'slow') {
    if (k === fast.value) return;
    slow.value = k;
    phase.value = 'ready';
  }
}

const longest = computed(() => Math.max(...traces.value.map((tr) => tr.length)));
function go() {
  phase.value = 'race';
  t.value = 0;
  timer = setInterval(() => {
    t.value += RACE_STRIDE;
    if (t.value >= longest.value) finish();
  }, RACE_TICK);
}
function finish() {
  stop();
  t.value = longest.value;
  phase.value = 'end';
}

const now = (k: number) => {
  const tr = traces.value[k];
  return tr[Math.min(t.value, tr.length - 1)];
};
/** 按跑完所需的步数排名，1 最快 */
const rank = computed(() => {
  const order = traces.value.map((tr, k) => [tr.length, k]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  return traces.value.map((_, k) => order.indexOf(k) + 1);
});
const fastest = computed(() => rank.value.indexOf(1));
const slowest = computed(() => rank.value.indexOf(lanes.value.length));
const win = computed(() => fast.value === fastest.value && slow.value === slowest.value);

const prompt = computed(() => ({
  fast: '这四组 12 个数都要排好。你猜哪一组最快？点它。',
  slow: '哪一组最慢？',
  ready: '预测好了，开跑！',
  race: '跑……',
  end: '',
}[phase.value]));

// 切换标签时赛跑要停下，停在当前画面
useStageStop(() => {
  if (phase.value === 'race') finish();
  else stop();
});
onBeforeUnmount(stop);
</script>

<template>
  <div class="stage">
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <div class="lanes">
      <button
        v-for="(l, k) in lanes"
        :key="k"
        type="button"
        class="lane"
        :class="{ chosen: fast === k || slow === k, done: t >= traces[k].length - 1 && phase !== 'fast' && phase !== 'slow' && phase !== 'ready' }"
        :disabled="phase !== 'fast' && phase !== 'slow'"
        :aria-label="'第 ' + LETTERS[k] + ' 组' + (fast === k ? '，猜最快' : '') + (slow === k ? '，猜最慢' : '')"
        @click="choose(k)"
      >
        <span class="head">
          <b>{{ LETTERS[k] }}</b>
          <span v-if="fast === k" class="pick-tag">🐇 猜最快</span>
          <span v-if="slow === k" class="pick-tag">🐢 猜最慢</span>
          <span v-if="phase === 'end'" class="kind">{{ LANE_NAME[l.kind] }}</span>
        </span>
        <span class="sticks" :style="{ '--n': CHALLENGE_N }" aria-hidden="true">
          <i
            v-for="(v, x) in now(k).arr"
            :key="x"
            :class="{ hole: x === now(k).hole && now(k).key !== null, vs: x === now(k).cmp }"
            :style="{ height: (v / CHALLENGE_N) * 100 + '%' }"
          />
        </span>
        <span class="meter">
          <span>挪 <b>{{ now(k).moves }}</b> 次</span>
          <span v-if="phase === 'race' || phase === 'end'">{{ t >= traces[k].length - 1 ? '🏁 第 ' + rank[k] + ' 名' : '' }}</span>
        </span>
      </button>
    </div>
    <div class="row">
      <button v-if="phase === 'ready'" type="button" class="btn small primary" @click="go">🏁 开跑</button>
      <button v-if="phase === 'race'" type="button" class="btn small" @click="finish">⏩ 直接看结果</button>
      <button v-if="phase === 'slow' || phase === 'ready'" type="button" class="btn small" @click="fast = null; slow = null; phase = 'fast'">重新猜</button>
    </div>
    <div v-if="phase === 'end'" class="result">
      <h3>{{ win ? '🏅 全猜对了！' : '🤔 和你猜的不太一样' }}</h3>
      <p>
        最快的是 {{ LETTERS[fastest] }}（{{ LANE_NAME[lanes[fastest].kind] }}，挪 {{ traces[fastest].at(-1)!.moves }} 次），
        最慢的是 {{ LETTERS[slowest] }}（{{ LANE_NAME[lanes[slowest].kind] }}，挪 {{ traces[slowest].at(-1)!.moves }} 次）。
      </p>
      <p>挪动次数正好等于逆序对数（前大后小的对数）。「只有最后一个最小」看着几乎有序，可 1 得一路挪到最前面，要挪 {{ CHALLENGE_N - 1 }} 次；完全倒序每一对都是逆序，{{ CHALLENGE_N }} × {{ CHALLENGE_N - 1 }} ÷ 2 = {{ (CHALLENGE_N * (CHALLENGE_N - 1)) / 2 }} 次。</p>
      <button type="button" class="btn small" @click="fresh">再来一局</button>
    </div>
  </div>
</template>

<style scoped>
.lanes { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 10px; }
.lane {
  font: inherit; color: var(--fg); text-align: left; cursor: pointer; min-width: 0;
  display: flex; flex-direction: column; gap: 8px; padding: 10px 12px;
  border-radius: 10px; border: 1.5px solid var(--line); background: var(--bg);
}
.lane:disabled { cursor: default; }
.lane:not(:disabled):hover { border-color: var(--accent); }
.lane:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.lane.chosen { border-color: var(--mid); }
.lane.done { border-color: var(--accent); }
.head { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; font-size: 14px; }
.head b { font: 700 16px var(--mono); }
.pick-tag { font-size: 13px; }
.kind { color: var(--muted); font-size: 13px; }
.sticks { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 3px; height: 56px; align-items: end; }
.sticks i { display: block; background: var(--muted); border-radius: 2px 2px 0 0; min-height: 3px; }
.sticks i.hole { background: transparent; outline: 1.5px dashed var(--muted); outline-offset: -1.5px; }
.sticks i.vs { background: var(--mid); }
.meter { display: flex; justify-content: space-between; gap: 8px; font: 500 13px var(--mono); color: var(--muted); }
.meter b { color: var(--fg); }
</style>
