<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CHALLENGE_N, CHALLENGE_OPTIONS, INPUT_NAME, STRATEGY_NAME, averageCompares, buildTrace, countCompares, genChallenge,
  seeded, worstCompares,
  type InputKind, type Strategy,
} from '../../engine/quick-sort';
import Segmented from '../../components/shared/Segmented.vue';

// 做：挑战。先预测三种 10 个数的输入，「每次拿最后一个当标杆」要比较几次，
// 再把三种输入、三种选标杆的办法放在一起比（n = 10、100、1000）。
const N = CHALLENGE_N;
const OPTIONS = CHALLENGE_OPTIONS;
const QS = ref(genChallenge());

const qi = ref(0);
const picked = ref<number | null>(null);
const right = ref(0);
const finished = ref(false);

const q = computed(() => QS.value[qi.value]);
const answer = computed(() => countCompares(q.value.arr, 'last').compares);
const rounds = computed(() =>
  buildTrace(q.value.arr).filter((s) => s.line === 3).map((s) => ({ size: s.hi! - s.lo! + 1, cmp: s.hi! - s.lo! })),
);

function choose(v: number) {
  if (picked.value !== null) return;
  picked.value = v;
  if (v === answer.value) right.value++;
}
function next() {
  if (qi.value >= QS.value.length - 1) {
    finished.value = true;
    return;
  }
  qi.value++;
  picked.value = null;
}
function again() {
  QS.value = genChallenge();
  qi.value = 0;
  picked.value = null;
  right.value = 0;
  finished.value = false;
}

const size = ref(100);
const KINDS: InputKind[] = ['sorted', 'reversed', 'random'];
const STRATS: Strategy[] = ['last', 'random', 'median3'];
const table = computed(() => {
  const rand = seeded(2024);
  const runs = size.value >= 1000 ? 5 : 20;
  return KINDS.map((kind) => STRATS.map((st) => averageCompares(kind, size.value, st, runs, rand)));
});
const top = computed(() => Math.max(...table.value.flat()));
const width = (v: number) => (Math.log10(1 + v) / Math.log10(1 + top.value)) * 100 + '%';
const fmt = (v: number) => Math.round(v).toLocaleString('en-US');
</script>

<template>
  <div class="stage">
    <template v-if="!finished">
      <p class="note">第 {{ qi + 1 }} / {{ QS.length }} 题：<b>{{ q.name }}</b>。快速排序每次都拿<b>最右边</b>的当标杆（就是前面「做」里的代码），一共要比较几次 <code class="path">arr[j] &lt; pivot</code>？</p>
      <div class="opts">
        <button
          v-for="o in OPTIONS" :key="o" type="button" class="btn small mono" :disabled="picked !== null"
          :class="{ ok: picked !== null && o === answer, no: picked === o && o !== answer }"
          :aria-label="o + ' 次'" @click="choose(o)"
        >{{ o }} 次</button>
      </div>
      <div v-if="picked !== null" class="result">
        <h3>{{ picked === answer ? '🎯 对了，' : '答案是 ' }}{{ answer }} 次</h3>
        <p>
          第一次分区 {{ rounds[0]?.size }} 个数比 {{ rounds[0]?.cmp }} 次，可是标杆{{ q.arr[0] === q.arr[N - 1] ? '不比任何人小，所有人都被分到了右边' : '正好是最大的或最小的，一边是空的' }}，
          只站定了一个，剩下的 {{ N - 1 }} 个数原封不动再来一遍。
        </p>
        <p class="chain mono">{{ rounds.map((r) => r.cmp).join(' + ') }} = {{ answer }}，也就是 n(n − 1)/2 = {{ worstCompares(N) }}。</p>
        <button type="button" class="btn small primary" @click="next">{{ qi >= QS.length - 1 ? '看对比表' : '下一题' }}</button>
      </div>
    </template>

    <template v-else>
      <h3>{{ right === QS.length ? '🏅 三题全对' : '答对了 ' + right + ' / ' + QS.length + ' 题' }}</h3>
      <p class="note">三种看起来完全不一样的输入，答案竟然都是 {{ worstCompares(N) }}：<b>标杆总是最大、最小，或者不比任何人小</b>，每次分区只站定一个人。这就是快速排序的最坏情况 O(n²)，下面的表格看看怎么躲开它。</p>
      <Segmented v-model="size" legend="数组大小 n" :options="[10, 100, 1000].map((n) => ({ value: n, label: String(n) }))" />
      <div class="tbl" role="table" :aria-label="'n = ' + size + ' 时的比较次数'">
        <div class="r head" role="row">
          <span class="c0" role="columnheader">输入</span>
          <span v-for="s in STRATS" :key="s" role="columnheader">{{ STRATEGY_NAME[s] }}</span>
        </div>
        <div v-for="(kind, ki) in KINDS" :key="kind" class="r" role="row">
          <span class="c0" role="rowheader">{{ INPUT_NAME[kind] }}</span>
          <span v-for="(s, si) in STRATS" :key="s" role="cell" class="cell" :class="{ worst: table[ki][si] === top }">
            <b>{{ fmt(table[ki][si]) }}</b>
            <i class="meter"><i :style="{ width: width(table[ki][si]) }" /></i>
          </span>
        </div>
      </div>
      <p class="small-note">单位：比较次数，条形用对数刻度。随机的格子是跑了多次的平均。固定拿最后一个遇到有序或倒序，退化成 n(n − 1)/2 = {{ fmt(worstCompares(size)) }}；随机挑和三数取中（取最左、正中、最右三个数的中位数当标杆）不管输入长什么样，都是 n log n 量级。</p>
      <button type="button" class="btn small" @click="again">再答一遍</button>
    </template>
  </div>
</template>

<style scoped>
.path { font: 500 0.9em var(--mono); background: var(--out); padding: 1px 6px; border-radius: 4px; }
.opts { display: flex; flex-wrap: wrap; gap: 10px; }
.mono { font-family: var(--mono); }
.opts .btn.ok { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); opacity: 1; }
.opts .btn.no { border-color: var(--warn); box-shadow: 0 0 0 2px var(--warn); opacity: 1; }
.chain { overflow-wrap: anywhere; }
.tbl { display: flex; flex-direction: column; gap: 8px; }
.r { display: grid; grid-template-columns: minmax(0, 0.9fr) repeat(3, minmax(0, 1fr)); gap: 8px; align-items: center; font-size: 13px; }
.r.head { color: var(--muted); font-size: 12px; align-items: end; }
.c0 { font-weight: 600; }
.cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cell b { font: 700 13px var(--mono); font-variant-numeric: tabular-nums; }
.meter { display: block; height: 8px; border-radius: 4px; background: var(--out); overflow: hidden; }
.meter i { display: block; height: 100%; background: var(--accent); }
.cell.worst b { color: var(--warn); }
.cell.worst .meter i { background: var(--warn); }
</style>
