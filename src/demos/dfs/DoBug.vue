<script setup lang="ts">
import { BUGS, L, bugVerdict, parseMaze, runBug, type Bug, type DfsStep } from '../../engine/dfs';
import BugHunt from '../../components/shared/BugHunt.vue';
import Grid from './Grid.vue';
import StackRow from './StackRow.vue';
import { emojisOf, stepLabels, stepTones, wallsOf } from './view';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: DfsStep): [string, string | number][] => {
  const top = s.stack[s.stack.length - 1];
  return [
    ['(r, c)', top ? '(' + top[0] + ',' + top[1] + ')' : '—'],
    ['递归深度', s.stack.length],
    ['dfs 调用次数', s.calls],
  ];
};
const mz = (b: Bug) => parseMaze(b.maze);
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">下面这个山洞，{{ bug.expect }}。</template>
    <template #board="{ step: s, bug }">
      <div class="mini">
        <Grid
          :w="mz(bug).w" :h="mz(bug).h" :walls="wallsOf(mz(bug))" :tones="stepTones(s, mz(bug))" :labels="stepLabels(s)"
          :emojis="emojisOf(mz(bug), s.cur)" coords
        />
      </div>
      <StackRow :stack="s.stack" :max="12" />
    </template>
    <template #transport="{ player: p }">
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x: DfsStep) => x.line === L.mark)">下一个新格子</button>
      <button type="button" class="btn small" :disabled="p.atEnd.value" @click="p.jumpTo((x: DfsStep) => x.done)">跳到结尾</button>
    </template>
  </BugHunt>
</template>

<style scoped>
.mini { max-width: 280px; width: 100%; }
</style>
