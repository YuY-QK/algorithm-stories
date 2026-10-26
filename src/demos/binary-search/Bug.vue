<script setup lang="ts">
import type { Bug, BugStep } from '../../engine/binary-search';

// 找 bug 的画面：有坑的代码跑到这一步时的数组。整个面板是共享的 BugHunt
defineProps<{ step: BugStep; bug: Bug }>();
</script>

<template>
  <div v-if="bug.values" class="arr" aria-hidden="true">
    <div v-for="(v, k) in bug.values" :key="k" class="cell" :class="{ out: k < step.lo || k > step.hi, mid: k === step.mid }">
      <div class="tag">{{ [k === step.lo && 'lo', k === step.mid && 'mid', k === step.hi && 'hi'].filter(Boolean).join('·') }}</div>
      <div class="val">{{ v }}</div>
      <div class="idx">{{ k }}</div>
    </div>
  </div>
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
