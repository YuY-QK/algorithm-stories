<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { opText, type LruStep, type TraceInput } from '../../../../engine/lru-cache';
import ListView from './ListView.vue';

// 做：逐步执行的画面。上面是这一串操作（当前的亮着，get 做完显示返回值），下面是链表和哈希表。
defineProps<{ input: TraceInput; step: LruStep; t: (msg: Msg) => string }>();
</script>

<template>
  <ol class="ops" :aria-label="t(m('scene.opsAria'))">
    <li v-for="(o, k) in input.ops" :key="k" :class="{ now: k === step.op, past: k < step.op }">
      <span class="mono">{{ opText(o) }}</span><span v-if="step.rets[k] !== undefined" class="r">= {{ step.rets[k] }}</span>
    </li>
  </ol>
  <ListView :list="step.list" :cap="input.cap" :map-keys="step.mapKeys" :hand="step.hand" :focus="step.focus" :evicted="step.evicted" :t="t" />
</template>

<style scoped>
.ops { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.ops li { font: 500 13px var(--mono); padding: 3px 8px; border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--muted); }
.ops li.past { color: var(--fg); }
.ops li.now { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.ops .r { margin-left: 4px; font-weight: 700; }
</style>
