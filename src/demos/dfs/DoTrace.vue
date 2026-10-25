<script setup lang="ts">
import { computed, ref } from 'vue';
import { CODE, L, TRACE_MAZES, buildTrace, coord, parseMaze, type DfsStep, type Maze as MazeT } from '../../engine/dfs';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import Grid from './Grid.vue';
import StackRow from './StackRow.vue';
import { emojisOf, stepLabels, stepTones, wallsOf } from './view';

// 做：逐步执行。山洞、调用栈、代码行同步。
const which = ref(0);
const maze = computed<MazeT>(() => parseMaze(TRACE_MAZES[which.value].rows));
const steps = computed(() => buildTrace(maze.value));
const p = usePlayer(steps, [
  { label: '慢', ms: 900 },
  { label: '中', ms: 450 },
  { label: '快', ms: 120 },
], 2);
const s = computed<DfsStep>(() => p.step.value);

const vars = computed<[string, string | number][]>(() => {
  const top = s.value.stack[s.value.stack.length - 1];
  return [
    ['(r, c)', top ? '(' + top[0] + ',' + top[1] + ')' : '—'],
    ['递归深度', s.value.stack.length],
    ['dfs 调用次数', s.value.calls],
    ['visited 个数', s.value.order.length],
  ];
});

const summary = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  return st.result
    ? '返回 true。一共调用了 dfs ' + st.calls + ' 次，标记了 ' + st.order.length + ' 个格子。格子上的数字是被标记的先后：DFS 一路钻到底，所以编号不是一圈一圈往外涨的。'
    : '返回 false：能走到的 ' + st.order.length + ' 个格子全部走遍，没有碰到宝藏。';
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="which" legend="山洞" :options="TRACE_MAZES.map((t, k) => ({ value: k, label: t.label }))" />
  </div>

  <div class="stage">
    <Grid
      :w="maze.w" :h="maze.h" :walls="wallsOf(maze)" :tones="stepTones(s, maze)" :labels="stepLabels(s)"
      :emojis="emojisOf(maze, s.cur)" coords
    />
    <p class="small-note">格子里的数字是被标记 visited 的先后。橙色实心：正在执行的这一层；浅橙：调用栈里的格子，也就是现在这条路；浅绿：走过又退回来的。</p>
    <StackRow :stack="s.stack" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.line === L.mark)">下一个新格子</button>
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.line === L.back)">下一次回溯</button>
    </Transport>
    <p v-if="s.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
  <p class="small-note">DIRS 是上、右、下、左四个方向：<code>listOf(-1 to 0, 0 to 1, 1 to 0, 0 to -1)</code>；<code>findCell</code> 找出 S 所在的格子。<code>dfs</code> 每被调用一次，调用栈就多一层；return 一次，就少一层。</p>
</template>

<style scoped>
.note { overflow-wrap: anywhere; }
</style>
