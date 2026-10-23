<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CODE, buildTrace, compareBounds, genArray } from '../../engine/merge-sort';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import MergeView from './MergeView.vue';

// 做：逐步执行。当前区间、mid、递归深度、调用栈、临时数组和代码行同步，记下比较次数。
type Kind = 'random' | 'sorted' | 'reversed';
const size = ref(6);
const kind = ref<Kind>('random');
const values = ref<number[]>(make());
const steps = computed(() => buildTrace(values.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1000 },
  { label: '中', ms: 550 },
  { label: '快', ms: 200 },
]);

function make(): number[] {
  const n = size.value;
  if (kind.value === 'sorted') return Array.from({ length: n }, (_, k) => (k + 1) * 3);
  if (kind.value === 'reversed') return Array.from({ length: n }, (_, k) => (n - k) * 3);
  return genArray(n, 30);
}
function fresh() { values.value = make(); }
watch([size, kind], fresh);

const s = computed(() => p.step.value);
const vars = computed<[string, string | number][]>(() => [
  ['lo', s.value.lo], ['hi', s.value.hi], ['mid', s.value.mid ?? '—'], ['深度', s.value.depth],
  ['i', s.value.i ?? '—'], ['j', s.value.j ?? '—'], ['k', s.value.k ?? '—'], ['比较', s.value.compares + ' 次'],
]);

const summary = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  const n = values.value.length;
  const b = compareBounds(n);
  const maxDepth = Math.max(...steps.value.map((x) => x.depth));
  return '排好了：比较 ' + st.compares + ' 次。n = ' + n + ' 时最少 ' + b.min + ' 次（每次合并一边先用完），最多 ' + b.max +
    ' 次（每次合并两边都用到最后）。一共调用 ' + steps.value.filter((x) => x.line === 1).length + ' 次，合并 ' +
    steps.value.filter((x) => x.line === 16).length + ' 次，递归最深 ' + maxDepth + ' 层。';
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="size" legend="数组大小" :options="[4, 6, 8].map((n) => ({ value: n, label: String(n) }))" />
    <Segmented
      v-model="kind"
      legend="初始顺序"
      :options="[{ value: 'random', label: '随机' }, { value: 'sorted', label: '已排好' }, { value: 'reversed', label: '倒序' }]"
    />
    <button type="button" class="btn small" @click="fresh">换一组</button>
  </div>

  <div class="stage">
    <MergeView :step="s" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.line === 1 || x.done)">下一次调用</button>
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.line === 16 || x.done)">下一次合并</button>
    </Transport>
    <p v-if="s.done" class="summary">{{ summary }}</p>
    <p class="small-note">亮的格子是当前区间 [lo, hi)，橙色竖线是 mid 的位置；绿框是已经排好的，虚线格是已经放进 tmp 的，橙色是正在比较的两个队头。</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>
