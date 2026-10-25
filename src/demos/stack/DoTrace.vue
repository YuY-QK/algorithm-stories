<script setup lang="ts">
import { computed, ref } from 'vue';
import { buildTrace, clean, CODE, presetString, TRACE_MAX, TRACE_PRESETS, type PuzzleKind } from '../../engine/stack';
import CodePanel from '../../components/shared/CodePanel.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import BracketView from './BracketView.vue';

// 做：逐步执行 isValid。括号串、栈和代码行同步。
const MAX = TRACE_MAX;
const s = ref('{[()]}');
const steps = computed(() => buildTrace(s.value));
const p = usePlayer(steps);
const st = computed(() => p.step.value);

function onInput(e: Event) {
  const el = e.target as HTMLInputElement;
  const v = clean(el.value).slice(0, MAX);
  if (el.value !== v) el.value = v;
  s.value = v;
}
function preset(kind: PuzzleKind) {
  s.value = presetString(kind);
}

const ch = computed(() => (st.value.i >= 0 && st.value.i < s.value.length ? s.value[st.value.i] : '—'));
const vars = computed<[string, string | number][]>(() => [
  ['c', ch.value],
  ['top', st.value.top ?? '—'],
  ['栈', st.value.stack.length + ' 个'],
  ['返回', st.value.result === null ? '—' : String(st.value.result)],
]);

const summary = computed(() => {
  const x = st.value;
  if (!x.done) return '';
  return x.result
    ? '返回 true：' + s.value.length + ' 个字符扫了一遍，每个右括号都和栈顶配上，最后栈空。'
    : '返回 false。栈里最多同时放过 ' + Math.max(0, ...steps.value.map((y) => y.stack.length)) + ' 个左括号。';
});
</script>

<template>
  <div class="controls">
    <div class="field">
      <label for="st-input">括号串（只收 ()[]{}，最多 {{ MAX }} 个）</label>
      <input id="st-input" class="txt" type="text" autocomplete="off" spellcheck="false" :value="s" @input="onInput">
    </div>
    <div class="field">
      <span class="lab">换一个</span>
      <div class="inline">
        <button v-for="b in TRACE_PRESETS" :key="b.kind" type="button" class="btn small" @click="preset(b.kind)">{{ b.label }}</button>
      </div>
    </div>
  </div>

  <div class="stage">
    <BracketView :s="s" :i="st.i" :stack="st.stack" :top="st.top" :bad="st.done && st.result === false && st.i < s.length" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ st.note }}</p>
    <Transport :player="p" />
    <p v-if="st.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="st.line" lang="KOTLIN" />
</template>

<style scoped>
.txt {
  font: 500 16px var(--mono); color: var(--fg); background: var(--surface);
  border: 1.5px solid var(--line); border-radius: 8px; padding: 8px 10px; width: min(16em, 100%); box-sizing: border-box;
}
.txt:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
