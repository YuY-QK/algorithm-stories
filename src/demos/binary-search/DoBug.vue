<script setup lang="ts">
import { computed, ref } from 'vue';
import { BUGS, runBug, type Bug } from '../../engine/binary-search';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const which = ref<Bug['id']>(BUGS[0].id);
const bug = computed(() => BUGS.find((b) => b.id === which.value)!);
const steps = computed(() => runBug(bug.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 1300 },
  { label: '中', ms: 800 },
  { label: '快', ms: 350 },
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
  if (st.outcome === 'crash') return '💥 下标越界，程序崩溃';
  return '❌ 返回了 ' + st.result + '，不对';
});

const vars = computed<[string, string | number][]>(() => [
  ['lo', s.value.lo], ['mid', s.value.mid ?? '—'], ['hi', s.value.hi], ['target', bug.value.target],
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
    <p class="small-note">输入：{{ bug.values ? 'arr = [' + bug.values.join(', ') + ']，target = ' + bug.target : bug.expect }}。{{ bug.values ? bug.expect + '。' : '' }}</p>
    <div v-if="bug.values" class="arr" aria-hidden="true">
      <div v-for="(v, k) in bug.values" :key="k" class="cell" :class="{ out: k < s.lo || k > s.hi, mid: k === s.mid }">
        <div class="tag">{{ [k === s.lo && 'lo', k === s.mid && 'mid', k === s.hi && 'hi'].filter(Boolean).join('·') }}</div>
        <div class="val">{{ v }}</div>
        <div class="idx">{{ k }}</div>
      </div>
    </div>
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
.arr { display: flex; gap: 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 48px; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s;
}
.cell.out .val { background: var(--out); color: var(--out-ink); border-color: transparent; }
.cell.mid .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.verdict { font-weight: 700; }
.ask { font-size: 1.05rem; }
.fix { font: 500 0.95em var(--mono); background: var(--out); padding: 2px 6px; border-radius: 4px; word-break: break-all; }
.note { overflow-wrap: anywhere; }
</style>
