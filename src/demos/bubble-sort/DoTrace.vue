<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildTrace, CODE, genArray, ROUND_END_LINE, type Shape } from '../../engine/bubble-sort';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import Bars from './Bars.vue';

// 做：逐步执行。柱子、代码行、比较和交换次数同步。
const size = ref(8);
const shape = ref<Shape>('random');
const arr = ref<number[]>(genArray(size.value, shape.value));
const steps = computed(() => buildTrace(arr.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1000 },
  { label: '中', ms: 550 },
  { label: '快', ms: 200 },
]);

function fresh() { arr.value = genArray(size.value, shape.value); }
watch([size, shape], fresh);

const s = computed(() => p.step.value);
function toRoundEnd() { p.jumpTo((x) => x.line === ROUND_END_LINE || x.done); }

const vars = computed<[string, string | number][]>(() => [
  ['i', s.value.i ?? '—'],
  ['j', s.value.j ?? '—'],
  ['t', s.value.t ?? '—'],
  ['swapped', s.value.swapped === null ? '—' : String(s.value.swapped)],
  ['比较', s.value.compares + ' 次'],
  ['交换', s.value.swaps + ' 次'],
]);

const summary = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  const n = arr.value.length;
  const worst = (n * (n - 1)) / 2;
  return '排好了。比较 ' + st.compares + ' 次（最坏要 ' + worst + ' 次），交换 ' + st.swaps + ' 次。交换次数正好等于原数组里「前面大、后面小」的数对个数。';
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="size" legend="数组大小" :options="[6, 8, 12].map((n) => ({ value: n, label: String(n) }))" />
    <Segmented
      v-model="shape" legend="初始顺序"
      :options="[{ value: 'random', label: '随机' }, { value: 'nearly', label: '几乎有序' }, { value: 'reversed', label: '逆序' }]"
    />
    <button type="button" class="btn small" @click="fresh">新数组</button>
  </div>

  <div class="stage">
    <Bars :items="s.a" :j="s.j" :hl="s.hl" :sorted-from="s.sortedFrom" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="toRoundEnd">跳到本轮结束</button>
    </Transport>
    <p v-if="s.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>
