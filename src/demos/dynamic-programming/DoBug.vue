<script setup lang="ts">
import { BUGS, bugVerdict, runBug, type DpStep } from '../../engine/dynamic-programming';
import BugHunt from '../../components/shared/BugHunt.vue';
import DpRow from './DpRow.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: DpStep, bug: { n: number }): [string, string | number][] => [['n', bug.n], ['i', s.i ?? '—']];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">n = {{ bug.n }}。{{ bug.expect }}。</template>
    <template #board="{ step: s }">
      <DpRow :dp="s.dp" :cur="s.i !== null && s.i >= 0 && s.i < s.dp.length ? s.i : null" />
    </template>
  </BugHunt>
</template>
