<script setup lang="ts">
import { BUGS, bugVerdict, opText, runBug, type Bug, type LruStep } from '../../engine/lru-cache';
import BugHunt from '../../components/shared/BugHunt.vue';
import ListView from './ListView.vue';

// 做：找 bug。bug 版本是真的在改指针、改哈希表，先看它怎么跑错，再点出错的那一行。
const vars = (s: LruStep, bug: Bug): [string, string | number][] => [
  ['操作', s.opLabel], ['capacity', bug.cap], ['返回', s.ret ?? '—'],
];
</script>

<template>
  <BugHunt :bugs="BUGS" :run="runBug" :vars="vars" :verdict="bugVerdict">
    <template #input="{ bug }">{{ bug.expect }}。</template>
    <template #board="{ step: s, bug }">
      <ol class="ops" aria-label="操作序列">
        <li v-for="(o, k) in bug.ops" :key="k" :class="{ now: k === s.op }">{{ opText(o) }}</li>
      </ol>
      <ListView :list="s.list" :cap="bug.cap" :map-keys="s.mapKeys" :hand="s.hand" :focus="s.focus" :evicted="s.evicted" />
      <p v-if="s.bad" class="oops">⚠️ 到这里，链表或哈希表已经和正确的 LRU 对不上了。</p>
    </template>
  </BugHunt>
</template>

<style scoped>
.ops { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.ops li { font: 500 13px var(--mono); padding: 3px 8px; border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--muted); }
.ops li.now { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
</style>
