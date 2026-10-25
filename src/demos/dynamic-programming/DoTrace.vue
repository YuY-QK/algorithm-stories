<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildTrace, CODE } from '../../engine/dynamic-programming';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import DpRow from './DpRow.vue';

// 做：逐步执行。dp 表、代码行和变量同步。
const n = ref(8);
const steps = computed(() => buildTrace(n.value));
const p = usePlayer(steps);
const s = computed(() => p.step.value);

// 刚刚写进去的那一格：这一步比上一步多出来的
const fresh = computed(() => {
  const k = p.idx.value;
  if (k === 0) return null;
  const prev = steps.value[k - 1].dp;
  const idx = s.value.dp.findIndex((v, i) => v !== null && prev[i] === null);
  return idx >= 0 ? idx : null;
});
watch(n, () => p.reset());

const vars = computed<[string, string | number][]>(() => {
  const st = s.value;
  const i = st.i;
  return [
    ['n', n.value],
    ['i', i ?? '—'],
    ['dp[i-1]', i !== null && i >= 1 ? (st.dp[i - 1] ?? '—') : '—'],
    ['dp[i-2]', i !== null && i >= 2 ? (st.dp[i - 2] ?? '—') : '—'],
  ];
});

const summary = computed(() =>
  s.value.done ? '返回 dp[' + n.value + '] = ' + s.value.result + '。一共填了 ' + (n.value - 1) + ' 格，每一格只看前面两格，所以 n 级台阶只要 n 步，不用把几百种跳法一种一种数。' : '');
</script>

<template>
  <div class="controls">
    <Segmented v-model="n" legend="楼梯级数 n" :options="[5, 8, 12].map((v) => ({ value: v, label: String(v) }))" />
  </div>

  <div class="stage">
    <DpRow :dp="s.dp.slice(0, n + 1)" :cur="s.i !== null && s.i <= n ? s.i : null" :from="s.from" :fresh="fresh" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p" />
    <p v-if="summary" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
</template>
