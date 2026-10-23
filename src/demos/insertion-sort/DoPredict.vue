<script setup lang="ts">
import { computed, ref } from 'vue';
import { genArray, rounds, type Round } from '../../engine/insertion-sort';

// 做：猜下一步。每一轮（外层循环的一次）先点出 key 最后落在哪一格，再猜这一轮 arr[j] > key 比较了几次。连对 6 次过关。
const GOAL = 6;
const values = ref<number[]>([]);
const list = ref<Round[]>([]);
const r = ref(0);
const phase = ref<'pos' | 'cmp' | 'wrong' | 'end'>('pos');
const picked = ref<number | null>(null);
const why = ref('');
const streak = ref(0);
const passed = ref(false);
/** 答错时停在哪一问，看完解释后从下一问继续 */
let wrongAt: 'pos' | 'cmp' = 'pos';

function fresh() {
  values.value = genArray(8, 15);
  list.value = rounds(values.value);
  r.value = 0;
  phase.value = 'pos';
  picked.value = null;
}
fresh();

const cur = computed(() => list.value[r.value]);
/** 排完以后的数组 */
const finalArr = computed(() => [...values.value].sort((a, b) => a - b));

/** 这一题画面上显示的数组：答 pos 时 key 拿在手上，原位置是空位；答完 pos 后显示放好之后的样子 */
const view = computed(() => {
  if (phase.value === 'end') return { arr: finalArr.value, hole: -1, sorted: values.value.length, placed: -1 };
  const { before, i, key, pos } = cur.value;
  if (phase.value === 'pos' || (phase.value === 'wrong' && wrongAt === 'pos')) return { arr: before, hole: i, sorted: i, placed: -1 };
  const after = [...before.slice(0, pos), key, ...before.slice(pos, i), ...before.slice(i + 1)];
  return { arr: after, hole: -1, sorted: i + 1, placed: pos };
});

function hit() {
  streak.value++;
  if (streak.value >= GOAL) passed.value = true;
}
function miss(at: 'pos' | 'cmp', text: string) {
  streak.value = 0;
  wrongAt = at;
  why.value = text;
  phase.value = 'wrong';
}

function posWhy(rd: Round): string {
  const bigger = rd.before.slice(rd.pos, rd.i);
  const head = bigger.length ? '从右往左比：' + [...bigger].reverse().join('、') + ' 比 ' + rd.key + ' 大，依次往右挪；' : '';
  const stop = rd.pos > 0
    ? 'arr[' + (rd.pos - 1) + '] = ' + rd.before[rd.pos - 1] + ' 不比 ' + rd.key + ' 大，停下'
    : '一直挪到了最左边';
  return head + stop + '。key 落在下标 ' + rd.pos + '。' + (rd.before.slice(0, rd.i).includes(rd.key) ? '相等的元素不挪，key 排在它后面。' : '');
}

function tapCell(k: number) {
  if (phase.value !== 'pos') return;
  const rd = cur.value;
  if (k > rd.i) return;
  picked.value = k;
  if (k === rd.pos) {
    hit();
    phase.value = 'cmp';
  } else {
    miss('pos', posWhy(rd));
  }
}

function chooseCmp(c: number) {
  if (phase.value !== 'cmp') return;
  const rd = cur.value;
  if (c === rd.compares) {
    hit();
    advance();
    return;
  }
  miss('cmp', '挪了 ' + rd.moves + ' 次，每挪一次之前都比较过一次。' + (rd.pos > 0
    ? '最后和 arr[' + (rd.pos - 1) + '] = ' + rd.before[rd.pos - 1] + ' 比，不比 key 大，又比了 1 次，一共 ' + rd.compares + ' 次。'
    : '挪到最左边后 j = -1，j >= 0 不成立，&& 短路，arr[j] > key 不再计算，一共 ' + rd.compares + ' 次。'));
}

function advance() {
  picked.value = null;
  if (r.value >= list.value.length - 1) phase.value = 'end';
  else {
    r.value++;
    phase.value = 'pos';
  }
}

function goOn() {
  if (wrongAt === 'pos') {
    picked.value = null;
    phase.value = 'cmp';
  } else advance();
}

const prompt = computed(() => {
  if (phase.value === 'end') return '排好了！点「下一题」换一组。';
  const { i, key } = cur.value;
  if (phase.value === 'pos' || (phase.value === 'wrong' && wrongAt === 'pos')) return 'i = ' + i + '，key = ' + key + '。key 最后会落在哪一格？点它。';
  return 'key = ' + key + ' 放进了下标 ' + cur.value.pos + '。这一轮 arr[j] > key 一共比较了几次？';
});
</script>

<template>
  <div class="stage">
    <div class="vars">
      <span class="chip"><small>连对</small>{{ Math.min(streak, GOAL) }} / {{ GOAL }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <div class="prow" :style="{ '--n': view.arr.length }">
      <button
        v-for="(v, k) in view.arr"
        :key="k"
        type="button"
        class="cell"
        :class="{
          sorted: k < view.sorted && k !== view.hole,
          hole: k === view.hole,
          placed: k === view.placed,
          miss: phase === 'wrong' && wrongAt === 'pos' && k === picked,
        }"
        :disabled="phase !== 'pos' || k > cur.i"
        :aria-label="'下标 ' + k + (k === view.hole ? '，空位' : '，值 ' + v)"
        @click="tapCell(k)"
      >
        <span class="keyslot">{{ k === view.hole ? cur.key : '' }}</span>
        <span class="val">{{ v }}</span>
        <span class="idx">{{ k }}</span>
      </button>
    </div>
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <div v-if="phase === 'cmp'" class="answers">
      <button v-for="c in cur.i" :key="c" type="button" class="btn small mono" :aria-label="'比较 ' + c + ' 次'" @click="chooseCmp(c)">{{ c }} 次</button>
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
.prow { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 6px; max-width: calc(var(--n) * 56px); }
.cell { font: inherit; background: none; border: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; color: var(--fg); cursor: pointer; }
.cell:disabled { cursor: default; }
.cell:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 6px; }
.keyslot {
  width: 100%; height: 30px; display: grid; place-items: center; border-radius: 6px;
  font: 700 14px var(--mono);
}
.cell.hole .keyslot { background: var(--accent); color: var(--accent-ink); transform: rotate(-4deg); }
.val {
  width: 100%; height: 40px; display: grid; place-items: center; box-sizing: border-box;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell:not(:disabled):hover .val { border-color: var(--accent); }
.cell.sorted .val { border-color: var(--accent); }
.cell.hole .val { border-style: dashed; border-color: var(--muted); color: transparent; background: transparent; }
.cell.placed .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.cell.miss .val { border-color: var(--warn); border-style: solid; box-shadow: 0 0 0 2px var(--warn); }
.mono { font-family: var(--mono); }
.answers .btn { flex: 0 1 auto; }
.win { border-color: var(--accent); color: var(--accent); }
.oops-box { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; border-left: 3px solid var(--warn); padding-left: 12px; }
@media (prefers-reduced-motion: reduce) {
  .cell.hole .keyslot { transform: none; }
}
</style>
