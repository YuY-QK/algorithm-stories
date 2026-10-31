<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { BIG_STAIRS, NOTES_MAX, memoCalls, naiveCalls, type NotesGame } from '../../../../engine/dynamic-programming';

// 玩法二爬到最高一级以后，按钮下面再补一张表：更高的楼梯，两种算法各要算几次。
defineProps<{ state: NotesGame; t: (msg: Msg) => string }>();
defineEmits<{ act: [action: unknown] }>();
const fmt = (v: number) => v.toLocaleString('en-US');
</script>

<template>
  <div v-if="state.phase === 'explore' && state.n >= NOTES_MAX" class="result">
    <p><b>{{ t(m('scene.notes.bigQ')) }}</b>{{ t(m('scene.notes.bigRest')) }}</p>
    <table class="big">
      <thead><tr><th>{{ t(m('scene.notes.thStairs')) }}</th><th>{{ t(m('scene.notes.naive')) }}</th><th>{{ t(m('scene.notes.memo')) }}</th></tr></thead>
      <tbody>
        <tr v-for="b in BIG_STAIRS" :key="b">
          <td>{{ t(m('scene.notes.row', { n: b })) }}</td><td>{{ t(m('scene.notes.times', { n: fmt(naiveCalls(b)) })) }}</td><td>{{ t(m('scene.notes.times', { n: memoCalls(b) })) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.result { display: flex; flex-direction: column; gap: 14px; }
.big { border-collapse: collapse; width: 100%; font-size: 14px; }
.big th, .big td { text-align: right; padding: 6px 8px; border-bottom: 1.5px solid var(--line); font-variant-numeric: tabular-nums; }
.big th:first-child, .big td:first-child { text-align: left; }
.big td { font-family: var(--mono); }
</style>
