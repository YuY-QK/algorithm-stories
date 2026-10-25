<script setup lang="ts" generic="S extends Step, B extends BugInfo">
import { computed, ref } from 'vue';
import type { BugInfo, Step } from '../../engine/types';
import CodePanel from './CodePanel.vue';
import Segmented from './Segmented.vue';
import Transport from './Transport.vue';
import VarChips from './VarChips.vue';
import { usePlayer, type Speed } from './usePlayer';

// 找 bug 整个面板：选坑、播放有 bug 的代码怎么跑错、点出错的那一行、答对后的解释与修正。
const props = defineProps<{
  bugs: readonly B[];
  run: (bug: B) => S[];
  vars: (step: S, bug: B) => [string, string | number][];
  verdict: (step: S, bug: B) => string;
  speeds?: Speed[];
}>();

const which = ref<string>(props.bugs[0].id);
const bug = computed(() => props.bugs.find((b) => b.id === which.value)!);
const steps = computed(() => props.run(bug.value));
const p = usePlayer(steps, props.speeds);
const s = computed(() => p.step.value);

const solved = ref<Record<string, boolean>>({});
const tried = ref<Record<string, number[]>>({});

const marks = computed(() => {
  const m: Record<number, 'good' | 'bad'> = {};
  for (const l of tried.value[which.value] ?? []) m[l] = 'bad';
  if (solved.value[which.value]) m[bug.value.wrongLine] = 'good';
  return m;
});

const verdictText = computed(() => props.verdict(s.value, bug.value));
const varList = computed(() => props.vars(s.value, bug.value));

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

const count = computed(() => props.bugs.filter((b) => solved.value[b.id]).length);
const options = computed(() => props.bugs.map((b, k) => ({ value: b.id, label: (solved.value[b.id] ? '✅ ' : '') + '坑 ' + (k + 1) })));
function onSwitch() { msg.value = ''; }
</script>

<template>
  <div class="controls">
    <Segmented v-model="which" legend="选一个坑" :options="options" @update:model-value="onSwitch" />
    <span class="chip">已找到 {{ count }} / {{ bugs.length }}</span>
  </div>

  <div class="stage">
    <h3>{{ bug.title }}</h3>
    <p class="small-note">输入：<slot name="input" :bug="bug" /></p>
    <slot name="board" :step="s" :bug="bug" />
    <VarChips :vars="varList" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p"><slot name="transport" :player="p" /></Transport>
    <p v-if="verdictText" class="summary verdict">{{ verdictText }}</p>
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
