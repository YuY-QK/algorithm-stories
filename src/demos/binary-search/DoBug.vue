<script setup lang="ts">
import { BUGS, bugVerdict, runBug, type Bug, type BugStep } from '../../engine/binary-search';
import BugHunt from '../../components/shared/BugHunt.vue';

// 做：找 bug。先看有 bug 的代码在动画里怎么跑错，再点出错的那一行。
const vars = (s: BugStep, bug: Bug): [string, string | number][] => [
  ['lo', s.lo], ['mid', s.mid ?? '—'], ['hi', s.hi], ['target', bug.target],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">{{ bug.values ? 'arr = [' + bug.values.join(', ') + ']，target = ' + bug.target : bug.expect }}。{{ bug.values ? bug.expect + '。' : '' }}</template>
    <template #board="{ step: s, bug }">
      <div v-if="bug.values" class="arr" aria-hidden="true">
        <div v-for="(v, k) in bug.values" :key="k" class="cell" :class="{ out: k < s.lo || k > s.hi, mid: k === s.mid }">
          <div class="tag">{{ [k === s.lo && 'lo', k === s.mid && 'mid', k === s.hi && 'hi'].filter(Boolean).join('·') }}</div>
          <div class="val">{{ v }}</div>
          <div class="idx">{{ k }}</div>
        </div>
      </div>
    </template>
  </BugHunt>
</template>

<style scoped>
.arr { display: flex; gap: 6px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 48px; }
.val {
  width: 100%; height: 40px; display: grid; place-items: center;
  font: 600 14px var(--mono); border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg);
  transition: background 0.2s, color 0.2s;
}
.cell.out .val { background: var(--out); color: var(--out-ink); border-color: transparent; }
.cell.mid .val { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
</style>
