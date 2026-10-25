<script setup lang="ts">
import { BUGS, bugVerdict, runBug, type Bug, type QuickStep } from '../../engine/quick-sort';
import BugHunt from '../../components/shared/BugHunt.vue';
import CallStack from './CallStack.vue';
import PartRow from './PartRow.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: QuickStep, _bug: Bug): [string, string | number][] => [
  ['lo', s.lo ?? '—'], ['hi', s.hi ?? '—'], ['i', s.i ?? '—'], ['j', s.j ?? '—'],
  ['pivot', s.pivot ?? '—'], ['栈深', s.stack.length],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">arr = [{{ bug.values.join(', ') }}]。{{ bug.expect }}。</template>
    <template #board="{ step: s }">
      <PartRow :step="s" />
      <CallStack :stack="s.stack" />
    </template>
    <template #transport="{ player: p }">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x: QuickStep) => x.done)">跳到结果</button>
    </template>
  </BugHunt>
</template>
