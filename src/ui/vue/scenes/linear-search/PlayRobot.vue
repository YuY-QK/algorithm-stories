<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { KID_N, robotNote, robotView, type RobotAction, type RobotState } from '../../../../engine/linear-search';
import Boxes from './Boxes.vue';

// 玩二：孩子选一个箱子藏小熊（或者不藏），小机器人从左往右开。按钮在机器人走的时候灰着。
// 下面记下每次试的结果，和一句引导的话。
const props = defineProps<{ state: RobotState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: RobotAction] }>();
const hide = (at: number | null) => emit('act', { type: 'hide', at });
const label = (x: { at: number | null; count: number }) =>
  props.t(x.at === null ? m('scene.tallyNone', { count: x.count }) : m('scene.tallyAt', { n: x.at + 1, count: x.count }));
</script>

<template>
  <Boxes :cells="robotView(state).cells" :pointer="robotView(state).pointer" kid="🤖" :label="t(m('scene.toyBoxes'))" :t="t" />

  <div class="pick">
    <p class="small-note">{{ t(m('scene.hideAt')) }}</p>
    <div class="picks">
      <button v-for="k in KID_N" :key="k" type="button" class="btn small" :disabled="!clickable" :aria-label="t(m('scene.hideAtN', { n: k }))" @click="hide(k - 1)">{{ k }}</button>
      <button type="button" class="btn small" :disabled="!clickable" @click="hide(null)">{{ t(m('scene.noHide')) }}</button>
    </div>
  </div>

  <div v-if="state.tally.length" class="tally" :aria-label="t(m('scene.tally'))">
    <span v-for="x in state.tally" :key="String(x.at)" class="chip">{{ label(x) }}</span>
  </div>
  <p class="q" aria-live="polite">{{ t(robotNote(state.tally)) }}</p>
</template>

<style scoped>
.picks { display: flex; flex-wrap: wrap; gap: 8px; }
.picks .btn { min-width: 44px; min-height: 44px; }
.tally { display: flex; flex-wrap: wrap; gap: 8px; }
.q { font-size: 1.1rem; max-width: 32em; }
</style>
