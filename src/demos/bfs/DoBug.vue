<script setup lang="ts">
import { BUGS, L, bugVerdict, coord, parseMaze, runBug, type Bug, type BfsStep } from '../../engine/bfs';
import BugHunt from '../../components/shared/BugHunt.vue';
import Maze from './Maze.vue';
import QueueRow from './QueueRow.vue';
import { stepLabels, stepTones } from './view';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const mz = (b: Bug) => parseMaze(b.maze);
const vars = (s: BfsStep, bug: Bug): [string, string | number][] => [
  ['(r, c)', s.cur === null ? '—' : coord(mz(bug), s.cur)],
  ['队列长度', s.queue.length],
  ['入队次数', s.pushes],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">下面这个迷宫，{{ bug.expect }}。</template>
    <template #board="{ step: s, bug }">
      <div class="mini">
        <Maze :maze="mz(bug)" :tones="stepTones(s)" :labels="stepLabels(s)" :mouse="mz(bug).start" coords />
      </div>
      <QueueRow :maze="mz(bug)" :queue="s.queue" :dist="s.dist" :max="16" />
    </template>
    <template #transport="{ player: p }">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x: BfsStep) => x.line === L.pop)">下一次出队</button>
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x: BfsStep) => x.done)">跳到结尾</button>
    </template>
  </BugHunt>
</template>

<style scoped>
.mini { max-width: 280px; width: 100%; }
</style>
