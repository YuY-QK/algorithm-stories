<script setup lang="ts">
import { computed, ref } from 'vue';
import { BUGS, runBug, suitOf, type Bug } from '../../engine/merge-sort';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import MergeView from './MergeView.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const which = ref<Bug['id']>(BUGS[0].id);
const bug = computed(() => BUGS.find((b) => b.id === which.value)!);
const steps = computed(() => runBug(bug.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1100 },
  { label: '中', ms: 650 },
  { label: '快', ms: 250 },
]);
const s = computed(() => p.step.value);

const solved = ref<Record<string, boolean>>({});
const tried = ref<Record<string, number[]>>({});

const marks = computed(() => {
  const m: Record<number, 'good' | 'bad'> = {};
  for (const l of tried.value[which.value] ?? []) m[l] = 'bad';
  if (solved.value[which.value]) m[bug.value.wrongLine] = 'good';
  return m;
});

const show = (arr: number[], ids: number[]) =>
  '[' + arr.map((v, k) => v + (bug.value.suits ? suitOf(ids[k]) : '')).join(', ') + ']';

const verdict = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  if (st.outcome === 'stuck') return '🔁 区间永远分不完，递归停不下来，最后栈溢出（StackOverflowError）';
  if (st.outcome === 'unstable') return '⚠️ 结果 ' + show(st.arr, st.ids) + '：数字排好了，但两个 3 换了先后顺序，不稳定';
  if (st.outcome === 'wrong') return '❌ 结果 ' + show(st.arr, st.ids) + '，没排好，还丢了数';
  return '✅ 排好了';
});

const vars = computed<[string, string | number][]>(() => [
  ['lo', s.value.lo], ['hi', s.value.hi], ['深度', s.value.depth], ['比较', s.value.compares + ' 次'],
]);

const msg = ref('');
function pick(line: number) {
  const b = bug.value;
  if (solved.value[b.id]) return;
  if (line === b.wrongLine) {
    solved.value = { ...solved.value, [b.id]: true };
    msg.value = '';
  } else {
    tried.value = { ...tried.value, [b.id]: [...(tried.value[b.id] ?? []), line] };
    msg.value = '不是第 ' + line + ' 行。回到动画里，看看是哪一步开始不对的。';
  }
}

const count = computed(() => BUGS.filter((b) => solved.value[b.id]).length);
const options = computed(() => BUGS.map((b, k) => ({ value: b.id, label: (solved.value[b.id] ? '✅ ' : '') + '坑 ' + (k + 1) })));
function onSwitch() { msg.value = ''; }
</script>

<template>
  <div class="controls">
    <Segmented v-model="which" legend="选一个坑" :options="options" @update:model-value="onSwitch" />
    <span class="chip">已找到 {{ count }} / {{ BUGS.length }}</span>
  </div>

  <div class="stage">
    <h3>{{ bug.title }}</h3>
    <p class="small-note">输入：a = {{ show(bug.values, bug.values.map((_, k) => k)) }}。{{ bug.expect }}。</p>
    <MergeView :step="s" :suits="bug.suits" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p" />
    <p v-if="verdict" class="summary verdict">{{ verdict }}</p>
  </div>

  <p class="ask"><b>哪一行有 bug？</b>点它。</p>
  <CodePanel :lines="bug.code" :active="s.line" lang="KOTLIN" pickable :marks="marks" @pick="pick" />
  <p v-if="msg" class="oops">{{ msg }}</p>
  <div v-if="solved[bug.id]" class="result">
    <h3>✅ 找到了：第 {{ bug.wrongLine }} 行</h3>
    <p>{{ bug.explain }}</p>
    <p>改成：<code class="fix">{{ bug.fixed.trim() }}</code></p>
  </div>
</template>

<style scoped>
.verdict { font-weight: 700; overflow-wrap: anywhere; }
.ask { font-size: 1.05rem; }
.fix { font: 500 0.95em var(--mono); background: var(--out); padding: 2px 6px; border-radius: 4px; word-break: break-all; }
.note { overflow-wrap: anywhere; }
</style>
