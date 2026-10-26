<script setup lang="ts">
import { bugCells, BUGS, bugVerdict, runBug, type Bug, type BugStep } from '../../engine/linear-search';
import BugHunt from '../../components/shared/BugHunt.vue';
import Boxes from './Boxes.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: BugStep, bug: Bug): [string, string | number][] => {
  const base: [string, string | number][] = [
    ['target', bug.target],
    ['i', s.i < 0 ? '—' : s.i],
    ['arr[i]', s.i >= 0 && s.i < bug.arr.length ? bug.arr[s.i] : '—'],
  ];
  if (bug.id === 'last') base.push(['found', s.found ?? '—']);
  base.push(['返回', s.result === null ? '—' : s.result]);
  return base;
};
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">arr = [{{ bug.arr.join(', ') }}]，target = {{ bug.target }}。{{ bug.expect }}。</template>
    <template #board="{ step: s, bug }">
      <Boxes
        :cells="bugCells(bug, s)" :pointer="s.i >= 0 && s.i <= bug.arr.length ? s.i : -1"
        :ghost="bug.id === 'overrun' && s.i >= bug.arr.length" label="数组"
      />
    </template>
  </BugHunt>
</template>
