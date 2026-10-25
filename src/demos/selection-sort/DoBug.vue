<script setup lang="ts">
import { BUGS, bugVerdict, runBug, type BugStep } from '../../engine/selection-sort';
import BugHunt from '../../components/shared/BugHunt.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么排错，再点出错的那一行。
const vars = (s: BugStep): [string, string | number][] => [
  ['i', s.i ?? '—'], ['j', s.j ?? '—'], ['minIdx', s.minIdx ?? '—'],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">arr = [{{ bug.values.join(', ') }}]，{{ bug.expect }}。</template>
    <template #board="{ step: s }">
      <div class="arr" aria-hidden="true">
        <div v-for="(v, k) in s.a" :key="k" class="cell" :class="{ least: k === s.minIdx, cur: k === s.j }">
          <div class="tag">{{ [k === s.i && 'i', k === s.j && 'j', k === s.minIdx && 'min'].filter(Boolean).join('·') }}</div>
          <div class="val">{{ v }}</div>
          <div class="idx">{{ k }}</div>
        </div>
      </div>
    </template>
  </BugHunt>
</template>

<style scoped>
.arr { display: flex; gap: 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 48px; min-width: 0; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s;
}
.cell.cur .val { border-color: var(--fg); border-width: 2.5px; }
.cell.least .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
</style>
