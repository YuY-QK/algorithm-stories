<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildTrace, CODE, comparesFor, genArray, inversions, type Shape } from '../../engine/selection-sort';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';

// 做：逐步执行。i、j、minIdx、代码行、比较和交换次数同步。
const size = ref(8);
const shape = ref<Shape>('random');
const arr = ref<number[]>(genArray(size.value, shape.value));
const steps = computed(() => buildTrace(arr.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1100 },
  { label: '中', ms: 600 },
  { label: '快', ms: 250 },
]);
const s = computed(() => p.step.value);

function fresh() { arr.value = genArray(size.value, shape.value); }
watch([size, shape], fresh);

/** 跳到这一轮结束（交换完或判定不用换） */
function roundEnd() {
  const cur = s.value.sorted;
  p.jumpTo((x) => x.sorted > cur || x.done);
}

function tagFor(k: number) {
  const t: string[] = [];
  if (k === s.value.i) t.push('i');
  if (k === s.value.j) t.push('j');
  if (k === s.value.minIdx) t.push('min');
  return t.join('·');
}

const vars = computed<[string, string | number][]>(() => [
  ['i', s.value.i ?? '—'], ['j', s.value.j ?? '—'], ['minIdx', s.value.minIdx ?? '—'],
  ['比较', s.value.compares + ' 次'], ['交换', s.value.swaps + ' 次'],
]);

const summary = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  const n = arr.value.length;
  return '比较了 ' + st.compares + ' 次，正好是 n(n−1)/2 = ' + comparesFor(n) + '，和数组长什么样无关。交换了 ' + st.swaps
    + ' 次，最多也只有 n − 1 = ' + Math.max(n - 1, 0) + ' 次。同一个数组，冒泡排序要交换 ' + inversions(arr.value) + ' 次。';
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="size" legend="数组大小" :options="[6, 8, 10].map((n) => ({ value: n, label: String(n) }))" />
    <Segmented
      v-model="shape"
      legend="初始顺序"
      :options="[
        { value: 'random', label: '随机' },
        { value: 'dups', label: '有重复' },
        { value: 'sorted', label: '已排好' },
        { value: 'reversed', label: '倒序' },
      ]"
    />
    <button type="button" class="btn small" @click="fresh">新数组</button>
  </div>

  <div class="stage">
    <div class="arr" aria-hidden="true">
      <div
        v-for="(v, k) in s.a"
        :key="k"
        class="cell"
        :class="{ fixed: k < s.sorted, cur: k === s.j && s.cmp, least: k === s.minIdx, swapped: !!s.swap && s.swap.includes(k) }"
      >
        <div class="tag">{{ tagFor(k) }}</div>
        <div class="val">{{ v }}</div>
        <div class="idx">{{ k }}</div>
      </div>
    </div>
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="roundEnd">跳到本轮结束</button>
    </Transport>
    <p v-if="s.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>

<style scoped>
.arr { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 10px 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.cell.fixed .val { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.cell.cur .val { border-color: var(--fg); border-width: 2.5px; }
.cell.least .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.cell.swapped .val { box-shadow: 0 0 0 3px var(--mid); }
</style>
