<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { challengeView, type ChallengeAction, type ChallengeState } from '../../../../engine/bfs';
import Maze from './Maze.vue';

// 做：挑战的画面。11×11 的迷宫，没有水波数字，自己点出一条路；点错的提示放在迷宫下面。
const props = defineProps<{ state: ChallengeState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ChallengeAction] }>();
const v = computed(() => challengeView(props.state));
</script>

<template>
  <div class="vars">
    <span class="chip"><small>{{ t(m('chal.steps')) }}</small>{{ v.steps }}</span>
    <span v-if="state.phase !== 'play'" class="chip"><small>{{ t(m('chal.best')) }}</small>{{ v.best }}</span>
    <span v-if="state.wins" class="chip"><small>{{ t(m('chal.wins')) }}</small>{{ t(m('chal.winsVal', { n: state.wins })) }}</span>
  </div>
  <Maze
    :maze="v.maze" :tones="v.tones" :mouse="state.path[state.path.length - 1]" :clickable="clickable" :shake="state.shake"
    :t="t" @pick="(id: number) => emit('act', { type: 'tap', id })"
  />
  <p class="oops" aria-live="polite">{{ state.hint ? t(state.hint) : '' }}</p>
</template>
