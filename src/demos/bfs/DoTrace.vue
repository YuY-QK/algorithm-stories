<script setup lang="ts">
import { computed, ref } from 'vue';
import { CODE, L, TRACE_MAZES, buildTrace, coord, parseMaze, type BfsStep, type Maze as MazeT } from '../../engine/bfs';
import CodePanel from '../../components/shared/CodePanel.vue';
import Segmented from '../../components/shared/Segmented.vue';
import Transport from '../../components/shared/Transport.vue';
import VarChips from '../../components/shared/VarChips.vue';
import { usePlayer } from '../../components/shared/usePlayer';
import Maze from './Maze.vue';
import QueueRow from './QueueRow.vue';
import { stepTones, stepLabels } from './view';

// 做：逐步执行。迷宫、队列、代码行同步。
const which = ref(0);
const maze = computed<MazeT>(() => parseMaze(TRACE_MAZES[which.value].rows));
const steps = computed(() => buildTrace(maze.value));
const p = usePlayer(steps);
const s = computed<BfsStep>(() => p.step.value);

const vars = computed<[string, string | number][]>(() => [
  ['(r, c)', s.value.cur === null ? '—' : coord(maze.value, s.value.cur)],
  ['dist[r][c]', s.value.cur === null ? '—' : s.value.dist[s.value.cur]],
  ['队列长度', s.value.queue.length],
  ['入队次数', s.value.pushes],
]);

const summary = computed(() => {
  const st = s.value;
  if (!st.done) return '';
  const seen = st.visited.filter(Boolean).length;
  return st.result! >= 0
    ? '返回 ' + st.result + '：最少 ' + st.result + ' 步。一共 ' + st.pushes + ' 个格子入过队，每个格子最多一次，所以 BFS 的工作量和格子数成正比。'
    : '返回 -1：能走到的 ' + seen + ' 个格子全部走遍，没有碰到奶酪。';
});
</script>

<template>
  <div class="controls">
    <Segmented v-model="which" legend="迷宫" :options="TRACE_MAZES.map((t, k) => ({ value: k, label: t.label }))" />
  </div>

  <div class="stage">
    <Maze :maze="maze" :tones="stepTones(s)" :labels="stepLabels(s)" :mouse="maze.start" coords />
    <p class="small-note">格子里的数字是 dist（离起点几步）。橙色：刚出队的格子；粗框：正在看的邻居；虚线框：还在队列里。</p>
    <QueueRow :maze="maze" :queue="s.queue" :dist="s.dist" />
    <VarChips :vars="vars" />
    <p class="note" aria-live="polite">第 {{ p.idx.value + 1 }}/{{ p.total.value }} 步：{{ s.note }}</p>
    <Transport :player="p">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x) => x.line === L.pop)">下一次出队</button>
    </Transport>
    <p v-if="s.done" class="summary">{{ summary }}</p>
  </div>

  <CodePanel :lines="CODE" :active="s.line" lang="KOTLIN" />
  <p class="small-note">DIRS 是上、下、左、右四个方向：<code>listOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1)</code>；<code>findCell</code> 找出 S 所在的格子。</p>
</template>
