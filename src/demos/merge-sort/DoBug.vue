<script setup lang="ts">
import { BUGS, bugVerdict, runBug, showCards, type MergeStep } from '../../engine/merge-sort';
import BugHunt from '../../components/shared/BugHunt.vue';
import MergeView from './MergeView.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: MergeStep): [string, string | number][] => [
  ['lo', s.lo], ['hi', s.hi], ['深度', s.depth], ['比较', s.compares + ' 次'],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">a = {{ showCards(bug.values, bug.values.map((_, k) => k), bug.suits) }}。{{ bug.expect }}。</template>
    <template #board="{ step: s, bug }">
      <MergeView :step="s" :suits="bug.suits" />
    </template>
  </BugHunt>
</template>
