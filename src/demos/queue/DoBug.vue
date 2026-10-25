<script setup lang="ts">
import { BUGS, bugVerdict, opText, runBug, type Bug, type BugStep } from '../../engine/queue';
import BugHunt from '../../components/shared/BugHunt.vue';
import Cells from './Cells.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: BugStep, bug: Bug): [string, string | number][] => [
  ['head', s.head], ['tail', s.tail], ['size', s.size], ['容量', bug.cap],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">容量 {{ bug.cap }}。{{ bug.expect }}。</template>
    <template #board="{ step: s, bug }">
      <ol class="ops" aria-label="操作序列">
        <li v-for="(o, k) in bug.ops" :key="k" :class="{ now: k === s.op, past: k < s.op }">
          {{ opText(o) }}<b v-if="s.rets[k] !== undefined"> → {{ s.rets[k] }}</b>
        </li>
      </ol>
      <Cells :cells="s.cells" :head="s.head" :tail="s.tail" :size="Math.min(s.size, bug.cap)" :touched="s.touched" />
    </template>
  </BugHunt>
</template>

<style scoped>
.ops { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; font: 500 13px var(--mono); }
.ops li { padding: 2px 8px; border-radius: 6px; border: 1.5px solid var(--line); background: var(--bg); }
.ops li.past { color: var(--muted); }
.ops li.now { border-color: var(--mid); background: var(--mid); color: var(--mid-ink); }
</style>
