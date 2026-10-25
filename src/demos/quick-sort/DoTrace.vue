<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CODE, buildTrace, genArray, makeInput, permutation } from '../../engine/quick-sort';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import CallStack from './CallStack.vue';
import PartRow from './PartRow.vue';

// 做：逐步执行。看 partition 里 i、j 怎么走，看标杆站定，看调用栈怎么一层层压下去又弹出来。
type Kind = 'random' | 'sorted' | 'dup';
const size = ref(8);
const kind = ref<Kind>('random');
const values = ref<number[]>(make());
const steps = computed(() => buildTrace(values.value));
const p = usePlayer(steps);

function make(): number[] {
  const n = size.value;
  if (kind.value === 'sorted') return makeInput('sorted', n).map((v) => v * 3);
  if (kind.value === 'dup') return genArray(n, 3).map((v) => v * 4);
  return permutation(n).map((v) => v * 3);
}
function fresh() { values.value = make(); }
watch([size, kind], fresh);

const s = computed(() => p.step.value);
const vars = computed<[string, string | number][]>(() => [
  ['lo', s.value.lo ?? '—'], ['hi', s.value.hi ?? '—'], ['i', s.value.i ?? '—'], ['j', s.value.j ?? '—'],
  ['pivot', s.value.pivot ?? '—'], ['比较', s.value.compares + ' 次'], ['交换', s.value.swaps + ' 次'],
  ['栈深', s.value.stack.length],
]);

const summary = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  const n = values.value.length;
  return '排好了：比较 ' + st.compares + ' 次，交换 ' + st.swaps + ' 次，quickSort 被调用 ' + st.calls + ' 次，调用栈最深 ' + st.maxDepth + ' 层。n = ' + n +
    ' 时，比较次数最多 ' + (n * (n - 1)) / 2 + ' 次（每次分区都一边是空的）。' +
    (kind.value === 'sorted' ? '这就是「已经排好 + 固定拿最后一个」的最坏情况：每一层只站定一个，栈深 ' + st.maxDepth + '。' : '') +
    (kind.value === 'dup' ? '有重复的数：相等的都被分到右边，一层只站定一个的情况会多起来。' : '');
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="size" legend="数组大小" :options="[6, 8, 10].map((n) => ({ value: n, label: String(n) }))" />
    <Segmented
      v-model="kind"
      legend="初始顺序"
      :options="[{ value: 'random', label: '随机' }, { value: 'sorted', label: '已经排好' }, { value: 'dup', label: '很多重复' }]"
    />
    <button type="button" class="btn small" @click="fresh">换一组</button>
  </div>

  <div class="stage">
    <PartRow :step="s" />
    <VarChips :vars="vars" />
    <CallStack :stack="s.stack" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.line === 18 || x.done)">下一次分区</button>
    </Transport>
    <p v-if="s.done" class="summary">{{ summary }}</p>
    <p class="small-note">绿色是比标杆小的「矮队」，黄色是不比标杆小的「高队」，红色是标杆 🚩，深绿是已经站在最终位置的。变淡的格子不在当前这次调用的区间里，黑框是刚换过的两格。</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>
