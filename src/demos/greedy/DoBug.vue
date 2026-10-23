<script setup lang="ts">
import { computed, ref } from 'vue';
import { BUGS, runBug, type Bug } from '../../engine/greedy';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import CoinRow from './CoinRow.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const which = ref<Bug['id']>(BUGS[0].id);
const bug = computed(() => BUGS.find((b) => b.id === which.value)!);
const steps = computed(() => runBug(bug.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1100 },
  { label: '中', ms: 600 },
  { label: '快', ms: 220 },
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

const verdict = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  if (st.outcome === 'stuck') return '🔁 死循环，程序卡住了';
  const total = st.picked.reduce((a, x) => a + x, 0);
  return total !== bug.value.amount
    ? '❌ 只找出 ' + total + '，还差 ' + (bug.value.amount - total)
    : '❌ 找了 ' + st.picked.length + ' 枚，太多了';
});

const vars = computed<[string, string | number][]>(() => [
  ['amount', bug.value.amount], ['c', s.value.c ?? '—'], ['left', s.value.left ?? '—'], ['picked', s.value.picked.length + ' 枚'],
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
    <p class="small-note">输入：coins = [{{ bug.coins.join(', ') }}]，amount = {{ bug.amount }}。{{ bug.expect }}。</p>
    <CoinRow :coins="s.sorted" :c="s.c" :picked="s.picked" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.done)">跳到结果</button>
    </Transport>
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
.verdict { font-weight: 700; }
.ask { font-size: 1.05rem; }
.fix { font: 500 0.95em var(--mono); background: var(--out); padding: 2px 6px; border-radius: 4px; word-break: break-all; }
.note { overflow-wrap: anywhere; }
</style>
