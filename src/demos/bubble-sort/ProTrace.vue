<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildTrace, CODE, genArray, ROUND_END_LINE, type Shape } from '../../engine/bubble-sort';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';

// 高级：带「提前退出」优化的冒泡排序，逐步执行。
const size = ref(10);
const shape = ref<Shape>('random');
const input = ref<number[]>(genArray(size.value, shape.value));
const steps = computed(() => buildTrace(input.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1000 },
  { label: '中', ms: 450 },
  { label: '快', ms: 160 },
  { label: '很快', ms: 50 },
]);

function freshArray() { input.value = genArray(size.value, shape.value); }
watch([size, shape], freshArray);

const s = computed(() => p.step.value);
const max = computed(() => Math.max(...s.value.a));
const n = computed(() => s.value.a.length);

function cellClass(k: number) {
  const st = s.value;
  const inPair = st.j !== null && (k === st.j || k === st.j + 1);
  if (k >= st.sortedFrom) return 'sorted';
  if (inPair && st.swap) return 'swap';
  if (inPair && st.cmp) return 'cmp';
  return '';
}
function tagFor(k: number) {
  const j = s.value.j;
  return j === null ? '' : k === j ? 'j' : k === j + 1 ? 'j+1' : '';
}

const vars = computed<[string, string | number][]>(() => {
  const st = s.value;
  return [
    ['轮次', st.round || '—'], ['i', st.i ?? '—'], ['j', st.j ?? '—'],
    ['swapped', st.swapped === null ? '—' : st.swapped ? 'True' : 'False'],
    ['比较', st.compares], ['交换', st.swaps],
  ];
});

const summary = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  const worst = (n.value * (n.value - 1)) / 2;
  return '比较了 ' + st.compares + ' 次，交换了 ' + st.swaps + ' 次。n = ' + n.value + ' 时最坏要比较 ' + worst + ' 次' +
    (st.compares < worst ? '，提前退出省下了 ' + (worst - st.compares) + ' 次。' : '，这次正好是最坏情况。');
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="size" legend="数组大小" :options="[6, 10, 16].map((v) => ({ value: v, label: String(v) }))" />
    <Segmented
      v-model="shape"
      legend="初始顺序"
      :options="[{ value: 'random', label: '随机' }, { value: 'nearly', label: '几乎有序' }, { value: 'reversed', label: '逆序' }]"
    />
    <div class="field">
      <span class="lab">数据</span>
      <div class="inline"><button type="button" class="btn small" @click="freshArray">新数组</button></div>
    </div>
  </div>

  <div class="stage">
    <div class="arr" aria-hidden="true" :style="{ '--n': n }">
      <div v-for="(v, k) in s.a" :key="k" class="cell" :class="cellClass(k)">
        <div class="tag">{{ tagFor(k) }}</div>
        <div class="bar" :style="{ height: Math.round((v / max) * 110 + 6) + 'px' }" />
        <div class="val">{{ v }}</div>
        <div class="idx">{{ k }}</div>
      </div>
    </div>
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.line === ROUND_END_LINE)">跳到本轮结束</button>
    </Transport>
    <p v-if="s.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" />
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(var(--n, 10), minmax(0, 1fr)); gap: 4px; align-items: end; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.bar { width: 100%; background: var(--out); border-radius: 4px 4px 0 0; transition: height 0.2s, background 0.2s; }
.val {
  width: 100%; height: 30px; display: grid; place-items: center;
  font: 600 13px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell.cmp .bar, .cell.cmp .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.swap .bar, .cell.swap .val { background: var(--warn); color: var(--accent-ink); border-color: var(--warn); }
.cell.sorted .bar { background: var(--accent); }
.cell.sorted .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
@media (max-width: 520px) {
  .val { font-size: 11px; }
}
</style>
