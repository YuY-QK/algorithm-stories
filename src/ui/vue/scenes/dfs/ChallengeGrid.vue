<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { challengeView, type ChallengeAction, type ChallengeState } from '../../../../engine/dfs';
import Grid from './Grid.vue';

// 做：挑战的画面。同一个山洞里 DFS 和 BFS 的访问顺序完全不同；题目是 DFS 的第 k 个格子，点出来。
// 提示给出前一半，答完以后把 DFS 的前 k 个和 BFS 的第 k 个一起亮出来比；点到岩石的提示放在山洞下面。
const props = defineProps<{ state: ChallengeState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ChallengeAction] }>();
const v = computed(() => challengeView(props.state));
</script>

<template>
  <p>{{ t(m('chal.q1')) }}<b>{{ t(m('chal.q2', { k: state.k })) }}</b>{{ t(m('chal.q3')) }}</p>
  <div class="vars">
    <span class="chip"><small>{{ t(m('chal.chipQ')) }}</small>{{ t(m('chal.chipQV', { k: state.k })) }}</span>
    <span v-if="state.wins" class="chip"><small>{{ t(m('chal.chipWins')) }}</small>{{ t(m('chal.winsVal', { n: state.wins })) }}</span>
  </div>
  <Grid
    :w="v.maze.w" :h="v.maze.h" :walls="v.walls" :tones="v.tones" :labels="v.labels" :emojis="v.emojis"
    :clickable="clickable" :shake="state.shake" :t="t" @pick="(id: number) => emit('act', { type: 'tap', id })"
  />
  <p class="oops" aria-live="polite">{{ state.hint ? t(state.hint) : '' }}</p>
</template>
