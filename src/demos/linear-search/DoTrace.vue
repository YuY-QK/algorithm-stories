<script setup lang="ts">
import { computed, ref } from 'vue';
import { arrayCells, buildTrace, CODE, makePuzzle, TRACE_PRESETS, type PuzzleKind } from '../../engine/linear-search';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import Boxes from './Boxes.vue';

// 做：逐步执行 linearSearch。数组、下标和代码行同步。
const kind = ref<PuzzleKind>('middle');
const puzzle = ref(makePuzzle('middle'));
const steps = computed(() => buildTrace(puzzle.value.arr, puzzle.value.target));
const p = usePlayer(steps);
const st = computed(() => p.step.value);

function pick(k: PuzzleKind) {
  kind.value = k;
  puzzle.value = makePuzzle(k);
}
const options = TRACE_PRESETS.map((x) => ({ value: x.kind, label: x.label }));

const cells = computed(() => arrayCells(puzzle.value.arr, st.value));
const vars = computed<[string, string | number][]>(() => [
  ['target', puzzle.value.target],
  ['i', st.value.i < 0 ? '—' : st.value.i],
  ['arr[i]', st.value.i >= 0 && st.value.i < puzzle.value.arr.length ? puzzle.value.arr[st.value.i] : '—'],
  ['比较', st.value.checks + ' 次'],
  ['返回', st.value.result === null ? '—' : st.value.result],
]);
const summary = computed(() => {
  const x = st.value;
  if (!x.done) return '';
  return x.result === -1
    ? '返回 -1：' + puzzle.value.arr.length + ' 个全看完，一共比较了 ' + x.checks + ' 次。'
    : '返回 ' + x.result + '：比较了 ' + x.checks + ' 次就停了，后面的没有再看。';
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="kind" legend="目标在哪里" :options="options" @update:model-value="pick" />
    <button type="button" class="btn small" @click="pick(kind)">🎲 换一组数</button>
  </div>

  <div class="stage">
    <Boxes :cells="cells" :pointer="st.i >= 0 && st.i < puzzle.arr.length ? st.i : -1" label="数组" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ st.note }}</p>
    <Transport :player="p" />
    <p v-if="st.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="st.line" lang="KOTLIN" />
</template>
