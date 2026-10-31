<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { opText, type Op } from '../../../../engine/queue';

// 操作序列：一串 offer / poll。做到哪一个标出来，做完的变灰，返回值写在后面。
withDefaults(defineProps<{
  ops: Op[];
  /** 正在做的操作序号，-1 表示没有 */
  now?: number;
  /** 序号小于它的算做完了（变灰） */
  past?: number;
  /** 操作序号 → 返回值，有才显示 */
  rets?: Record<number, string>;
  t: (msg: Msg) => string;
}>(), { now: -1, past: 0, rets: () => ({}) });
</script>

<template>
  <ol class="ops" :aria-label="t(m('ops.label'))">
    <li v-for="(o, k) in ops" :key="k" :class="{ now: k === now, past: k < past }">
      {{ opText(o) }}<b v-if="rets[k] !== undefined"> → {{ rets[k] }}</b>
    </li>
  </ol>
</template>

<style scoped>
.ops { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; font: 500 13px var(--mono); }
.ops li { padding: 2px 8px; border-radius: 6px; border: 1.5px solid var(--line); background: var(--bg); }
.ops li.past { color: var(--muted); }
.ops li.now { border-color: var(--mid); background: var(--mid); color: var(--mid-ink); }
.ops b { font-weight: 700; }
</style>
