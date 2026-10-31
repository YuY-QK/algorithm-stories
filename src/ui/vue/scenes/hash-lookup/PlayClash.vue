<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import {
  CLASH_BOOKS, CLASH_ICON, clashBook, clashPiles, clashWant, type ClashAction, type ClashState,
} from '../../../../engine/hash-lookup';
import Shelves from './Shelves.vue';

// 玩二：手里的书（或要借的书）、选的办法、看了几个，台词，一排书架。借书时点书架交给规则。
// 台词在状态里（state.say），因为它要排在这一栏的下面。
const props = defineProps<{ state: ClashState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ClashAction] }>();

const MODE_NAME = { chain: m('clash.mode.chain'), probe: m('clash.mode.probe') };
const piles = computed(() => clashPiles(props.state.table, props.state.mode ?? 'chain'));
const holding = computed(() => !['fetch', 'fetching', 'done'].includes(props.state.phase) && props.state.n < CLASH_BOOKS.length);
const looked = computed(() => (props.state.phase === 'done' ? props.state.total : props.state.total + props.state.looks));
</script>

<template>
  <div class="top">
    <span v-if="holding" class="held" :aria-label="t(m('scene.held'))">📕 {{ clashBook(state) }}</span>
    <span v-else-if="state.phase !== 'done'" class="held" :aria-label="t(m('scene.want'))">🔎 {{ clashWant(state) }}</span>
    <span v-if="state.mode" class="chip"><small>{{ t(m('scene.mode')) }}</small>{{ CLASH_ICON[state.mode] }} {{ t(MODE_NAME[state.mode]) }}</span>
    <span v-if="state.phase === 'fetching' || state.phase === 'done'" class="chip"><small>{{ t(m('scene.looked')) }}</small>{{ looked }}</span>
  </div>
  <p class="say" aria-live="polite">{{ t(state.say) }}</p>
  <Shelves
    :piles="piles" :keeper="state.keeper" :clash="state.clash" :shake="state.shake" :clickable="clickable" :t="t"
    @pick="(i: number) => emit('act', { type: 'shelf', i })"
  />
</template>

<style scoped>
.top { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-height: 2.6em; }
.held { font: 700 1.6rem var(--mono); padding: 4px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface); }
.say { font-size: clamp(1.1rem, 4vw, 1.5rem); min-height: 2.8em; }
</style>
