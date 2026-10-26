<script setup lang="ts">
import { BUGS, bugVerdict, runBug, slotPiles, type Bug, type BugStep } from '../../engine/hash-lookup';
import BugHunt from '../../components/shared/BugHunt.vue';
import Shelves from './Shelves.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: BugStep): [string, string | number][] => [['i', s.i ?? '—'], ['容量', s.slots.length]];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">{{ (bug as Bug).input }}。{{ bug.expect }}。</template>
    <template #board="{ step: s }">
      <Shelves :piles="slotPiles(s.slots)" :keeper="s.i !== null && s.i >= 0 && s.i < s.slots.length ? s.i : null" />
    </template>
  </BugHunt>
</template>
