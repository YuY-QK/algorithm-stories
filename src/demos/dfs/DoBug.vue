<script setup lang="ts">
import { computed, ref } from 'vue';
import { BUGS, L, parseMaze, runBug, type Bug, type BugStep } from '../../engine/dfs';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import Grid from './Grid.vue';
import StackRow from './StackRow.vue';
import { emojisOf, stepLabels, stepTones, wallsOf } from './view';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const which = ref<Bug['id']>(BUGS[0].id);
const bug = computed(() => BUGS.find((b) => b.id === which.value)!);
const maze = computed(() => parseMaze(bug.value.maze));
const steps = computed(() => runBug(bug.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 900 },
  { label: '中', ms: 450 },
  { label: '快', ms: 100 },
]);
const s = computed<BugStep>(() => p.step.value);

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
  if (st.outcome === 'overflow') return '💥 StackOverflowError：调用栈叠了 ' + st.stack.length + ' 层，还在涨';
  if (st.outcome === 'crash') return '💥 下标越界，程序崩溃';
  return '❌ 返回了 ' + st.result + '，可是宝藏明明走得到，应该返回 true';
});

const vars = computed<[string, string | number][]>(() => {
  const top = s.value.stack[s.value.stack.length - 1];
  return [
    ['(r, c)', top ? '(' + top[0] + ',' + top[1] + ')' : '—'],
    ['递归深度', s.value.stack.length],
    ['dfs 调用次数', s.value.calls],
  ];
});

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
    <p class="small-note">输入：右边这个山洞，{{ bug.expect }}。</p>
    <div class="mini">
      <Grid
        :w="maze.w" :h="maze.h" :walls="wallsOf(maze)" :tones="stepTones(s, maze)" :labels="stepLabels(s)"
        :emojis="emojisOf(maze, s.cur)" coords
      />
    </div>
    <StackRow :stack="s.stack" :max="12" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.line === L.mark)">下一个新格子</button>
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.done)">跳到结尾</button>
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
.mini { max-width: 280px; width: 100%; }
.verdict { font-weight: 700; }
.ask { font-size: 1.05rem; }
.fix { font: 500 0.95em var(--mono); background: var(--out); padding: 2px 6px; border-radius: 4px; word-break: break-all; }
.note { overflow-wrap: anywhere; }
</style>
