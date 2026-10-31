<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { walkBook, type WalkAction, type WalkState } from '../../../../engine/hash-lookup';
import Shelves from './Shelves.vue';

// 玩一：手里的书、数到第几下、第几本，台词，一排书架。点书架交给规则。
// 台词在状态里（state.say），因为它要排在手里的书这一栏的下面。六本放完就什么都不画，由结算接手。
defineProps<{ state: WalkState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: WalkAction] }>();
</script>

<template>
  <template v-if="!state.finished">
    <div class="top">
      <span class="held" :aria-label="t(m('scene.held'))">📕 {{ walkBook(state) }}</span>
      <span v-if="state.count" class="chip"><small>{{ t(m('scene.count')) }}</small>{{ state.count }}</span>
      <span class="chip"><small>{{ t(m('scene.nth')) }}</small>{{ t(m('scene.nthVal', { r: state.r + 1, total: state.books.length })) }}</span>
    </div>
    <p class="say" aria-live="polite">{{ t(state.say) }}</p>
    <Shelves
      :piles="state.piles" :keeper="state.keeper" :glow="state.glow" :shake="state.shake" :clickable="clickable" :t="t"
      @pick="(i: number) => emit('act', { type: 'tap', i })"
    />
  </template>
</template>

<style scoped>
.top { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.held { font: 700 1.6rem var(--mono); padding: 4px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface); }
.say { font-size: clamp(1.1rem, 4vw, 1.5rem); min-height: 2.8em; }
</style>
