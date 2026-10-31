<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { colOf, emojisOf, parseMaze, rowOf, wallsOf, type PredictAnswer, type PredictView, type Tone } from '../../../../engine/dfs';
import Grid from './Grid.vue';
import StackRow from './StackRow.vue';

// 做：猜下一步的画面。探险家站稳以后：往前走就点要去的格子；死路了点「回溯」（旁边的按钮），再点要退回的路口；
// 点到不能点的格子（第二问里不在路上的格子、脚下这格）只是摇头提示，不算答错，这一步由画面自己处理。
const props = defineProps<{ view: PredictView; picked: PredictAnswer | null; pickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [value: PredictAnswer] }>();

const maze = computed(() => parseMaze(props.view.rows));
const shake = ref<[number, number] | null>(null);
const hint = ref<Msg | null>(null);
// 换了一问，提示收起来
watch(() => props.view, () => (hint.value = null));

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  props.view.visited.forEach((v, id) => {
    if (v) t[id] = 'crumb';
  });
  for (const id of props.view.path) t[id] = 'path';
  t[props.view.cur] = 'cur';
  return t;
});
const stack = computed<[number, number][]>(() => props.view.path.map((id) => [rowOf(maze.value, id), colOf(maze.value, id)]));

function pick(id: number) {
  if (!props.pickable) return;
  const q = props.view;
  if (q.back) {
    if (!q.path.includes(id) || id === q.cur) {
      hint.value = m('predict.pickPath');
      shake.value = [id, (shake.value?.[1] ?? 0) + 1];
      return;
    }
  } else if (id === q.cur) return;
  hint.value = null;
  emit('act', id);
}
</script>

<template>
  <Grid
    :w="maze.w" :h="maze.h" :walls="wallsOf(maze)" :tones="tones" :emojis="emojisOf(maze, view.cur, view.visited)" coords
    :clickable="pickable" :shake="shake" :t="t" @pick="pick"
  />
  <StackRow :stack="stack" :t="t" />
  <p v-if="hint" class="oops">{{ t(hint) }}</p>
</template>
