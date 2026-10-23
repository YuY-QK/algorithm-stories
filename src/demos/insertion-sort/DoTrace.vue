<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CODE, buildTrace, genArray, inversions, nearlySorted } from '../../engine/insertion-sort';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import SortRow from './SortRow.vue';

// 做：逐步执行。key、空位、j 和代码行同步，记下比较和挪动次数。
type Kind = 'random' | 'nearly' | 'reversed';
const size = ref(8);
const kind = ref<Kind>('random');
const values = ref<number[]>(make());
const steps = computed(() => buildTrace(values.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1000 },
  { label: '中', ms: 550 },
  { label: '快', ms: 220 },
]);

function make(): number[] {
  const n = size.value;
  if (kind.value === 'nearly') return nearlySorted(n, 2).map((v) => v * 3);
  if (kind.value === 'reversed') return Array.from({ length: n }, (_, k) => (n - k) * 3);
  return genArray(n, 30);
}
function fresh() { values.value = make(); }
watch([size, kind], fresh);

const s = computed(() => p.step.value);
const vars = computed<[string, string | number][]>(() => [
  ['i', s.value.i ?? '—'], ['j', s.value.j ?? '—'], ['key', s.value.key ?? '—'],
  ['比较', s.value.compares + ' 次'], ['挪动', s.value.moves + ' 次'],
]);

const summary = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  const n = values.value.length;
  return '排好了：比较 ' + st.compares + ' 次，挪动 ' + st.moves + ' 次。原数组的逆序对数正好也是 ' + inversions(values.value) +
    '。n = ' + n + ' 时，比较次数最少 ' + (n - 1) + ' 次（已经有序），最多 ' + (n * (n - 1)) / 2 + ' 次（完全倒序）。';
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="size" legend="数组大小" :options="[6, 8, 10].map((n) => ({ value: n, label: String(n) }))" />
    <Segmented
      v-model="kind"
      legend="初始顺序"
      :options="[{ value: 'random', label: '随机' }, { value: 'nearly', label: '几乎有序' }, { value: 'reversed', label: '倒序' }]"
    />
    <button type="button" class="btn small" @click="fresh">换一组</button>
  </div>

  <div class="stage">
    <SortRow :step="s" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.line === 9 || x.done)">下一次插入</button>
    </Transport>
    <p v-if="s.done" class="summary">{{ summary }}</p>
    <p class="small-note">绿框是排好的部分，虚线格是空位（里面还留着挪走前的旧值），橙色是正在比较或刚写入的格子。</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>
