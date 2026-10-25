<script setup lang="ts">
import { BUGS, bugVerdict, runBug, showCards, type InsertionStep } from '../../engine/insertion-sort';
import BugHunt from '../../components/shared/BugHunt.vue';
import SortRow from './SortRow.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: InsertionStep): [string, string | number][] => [
  ['i', s.i ?? '—'], ['j', s.j ?? '—'], ['key', s.key ?? '—'], ['挪动', s.moves + ' 次'],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">arr = {{ showCards(bug.values, bug.values.map((_, k) => k), bug.suits) }}。{{ bug.expect }}。</template>
    <template #board="{ step: s, bug }">
      <SortRow :step="s" :suits="bug.suits" />
    </template>
  </BugHunt>
</template>
