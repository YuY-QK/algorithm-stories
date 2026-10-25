<script setup lang="ts">
import { BUGS, bugVerdict, runBug, showItems, type Bug, type BubbleStep } from '../../engine/bubble-sort';
import BugHunt from '../../components/shared/BugHunt.vue';
import Bars from './Bars.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: BubbleStep): [string, string | number][] => [
  ['i', s.i ?? '—'], ['j', s.j ?? '—'], ['t', s.t ?? '—'],
  ['swapped', s.swapped === null ? '—' : String(s.swapped)],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">arr = {{ showItems((bug as Bug).input) }}。{{ bug.expect }}。</template>
    <template #board="{ step: s }">
      <Bars :items="s.a" :j="s.j" :hl="s.hl" :ghost="s.outcome === 'crash'" />
    </template>
  </BugHunt>
</template>
