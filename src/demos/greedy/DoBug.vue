<script setup lang="ts">
import { BUGS, bugVerdict, runBug, type Bug, type GreedyStep } from '../../engine/greedy';
import BugHunt from '../../components/shared/BugHunt.vue';
import CoinRow from './CoinRow.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: GreedyStep, bug: Bug): [string, string | number][] => [
  ['amount', bug.amount], ['c', s.c ?? '—'], ['left', s.left ?? '—'], ['picked', s.picked.length + ' 枚'],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">coins = [{{ bug.coins.join(', ') }}]，amount = {{ bug.amount }}。{{ bug.expect }}。</template>
    <template #board="{ step: s }">
      <CoinRow :coins="s.sorted" :c="s.c" :picked="s.picked" />
    </template>
    <template #transport="{ player: p }">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x: GreedyStep) => x.done)">跳到结果</button>
    </template>
  </BugHunt>
</template>
