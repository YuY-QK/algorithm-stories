<script setup lang="ts">
import { BUGS, bugVerdict, runBug, type Bug, type BugStep } from '../../engine/stack';
import BugHunt from '../../components/shared/BugHunt.vue';
import BracketView from './BracketView.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: BugStep, bug: Bug): [string, string | number][] => [
  ['c', s.i >= 0 && s.i < bug.input.length ? bug.input[s.i] : '—'],
  ['top', s.top ?? '—'],
  ['栈', s.stack.length + ' 个'],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">s = "{{ bug.input }}"。{{ bug.expect }}。</template>
    <template #board="{ step: s, bug }">
      <BracketView :s="bug.input" :i="s.i" :stack="s.stack" :top="s.top" :bad="s.done && s.i < bug.input.length" />
    </template>
  </BugHunt>
</template>
