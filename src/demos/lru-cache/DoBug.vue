<script setup lang="ts">
import { computed, ref } from 'vue';
import { BUGS, opText, runBug, type Bug } from '../../engine/lru-cache';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import ListView from './ListView.vue';

// 做：找 bug。bug 版本是真的在改指针、改哈希表，先看它怎么跑错，再点出错的那一行。
const which = ref<Bug['id']>(BUGS[0].id);
const bug = computed(() => BUGS.find((b) => b.id === which.value)!);
const run = computed(() => runBug(bug.value));
const steps = computed(() => run.value.steps);
const p = usePlayer(steps, [
  { label: '慢', ms: 1400 },
  { label: '中', ms: 850 },
  { label: '快', ms: 380 },
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

const vars = computed<[string, string | number][]>(() => [
  ['操作', s.value.opLabel], ['capacity', bug.value.cap], ['返回', s.value.ret ?? '—'],
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
    <p class="small-note">{{ bug.expect }}。</p>
    <ol class="ops" aria-label="操作序列">
      <li v-for="(o, k) in bug.ops" :key="k" :class="{ now: k === s.op }">{{ opText(o) }}</li>
    </ol>
    <ListView :list="s.list" :cap="bug.cap" :map-keys="s.mapKeys" :hand="s.hand" :focus="s.focus" :evicted="s.evicted" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <p v-if="s.bad" class="oops">⚠️ 到这里，链表或哈希表已经和正确的 LRU 对不上了。</p>
    <Transport :player="p" />
    <p v-if="p.atEnd.value && run.verdict" class="summary verdict">{{ run.verdict }}</p>
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
.ops { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.ops li { font: 500 13px var(--mono); padding: 3px 8px; border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--muted); }
.ops li.now { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.verdict { font-weight: 700; }
.ask { font-size: 1.05rem; }
.fix { font: 500 0.95em var(--mono); background: var(--out); padding: 2px 6px; border-radius: 4px; word-break: break-all; }
.note { overflow-wrap: anywhere; }
</style>
