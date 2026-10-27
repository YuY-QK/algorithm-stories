<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { findCells, KID_N, type FindAction, type FindState } from '../../../../engine/linear-search';
import Boxes from './Boxes.vue';

// 玩一：开箱子找小熊。盖着的、开过的、小熊亮起来；点箱子交给规则，重复点会晃一下。已开几个写在下面。
defineProps<{ state: FindState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: FindAction] }>();
</script>

<template>
  <Boxes :cells="findCells(state)" :clickable="clickable" :shake="state.shake" :label="t(m('scene.toyBoxes'))" :t="t" @pick="(k: number) => emit('act', { type: 'tap', k })" />
  <p class="count" :aria-label="t(m('scene.openedAria'))">{{ t(m('scene.opened')) }} <b>{{ state.opened.length }}</b> {{ t(m('scene.openedOf', { total: KID_N })) }}</p>
</template>

<style scoped>
.count { color: var(--muted); font-size: 0.95rem; }
</style>
