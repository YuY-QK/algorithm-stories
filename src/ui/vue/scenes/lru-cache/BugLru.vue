<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { opText, type Bug, type LruStep } from '../../../../engine/lru-cache';
import ListView from './ListView.vue';

// 做：找 bug 的画面。bug 版本是真的在改指针、改哈希表，先看它怎么跑错。
defineProps<{ step: LruStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <ol class="ops" :aria-label="t(m('scene.opsAria'))">
    <li v-for="(o, k) in bug.ops" :key="k" :class="{ now: k === step.op }">{{ opText(o) }}</li>
  </ol>
  <ListView :list="step.list" :cap="bug.cap" :map-keys="step.mapKeys" :hand="step.hand" :focus="step.focus" :evicted="step.evicted" :t="t" />
  <p v-if="step.bad" class="oops">{{ t(m('scene.bad')) }}</p>
</template>

<style scoped>
.ops { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.ops li { font: 500 13px var(--mono); padding: 3px 8px; border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--muted); }
.ops li.now { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
</style>
