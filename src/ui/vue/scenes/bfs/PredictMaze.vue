<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { parseMaze, predictKey, type PredictView, type Tone } from '../../../../engine/bfs';
import Maze from './Maze.vue';
import QueueRow from './QueueRow.vue';

// 做：猜下一步的画面。刚出队的格子高亮，点它的邻居（可以多个）再点「就这些」，或者点「它是终点」。
// 点了哪些格子是画面自己记的；答案是这些格子凑成的字符串（predictKey）。答错后 picked 就是它，把点错的格子标出来。
const props = defineProps<{ view: PredictView; picked: string | null; pickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [value: string] }>();

const maze = computed(() => parseMaze(props.view.rows));
const sel = ref<Set<number>>(new Set());
// 换了一问，点的格子清空
watch(() => props.view, () => (sel.value = new Set()));

/** 画在格子上的选择：等回答时是正在点的，答错看解释时是刚才答的 */
const chosen = computed<Set<number>>(() => {
  if (props.pickable) return sel.value;
  if (props.picked === null || props.picked === 'end' || props.picked === '') return new Set();
  return new Set(props.picked.split(',').map(Number));
});
const wrong = computed(() => !props.pickable && props.picked !== null);

const tones = computed(() => {
  const t: Record<number, Tone> = {};
  const q = props.view;
  q.visited.forEach((v, id) => {
    if (v) t[id] = 'old';
  });
  for (const id of q.queue) t[id] = 'queued';
  t[q.cur] = 'cur';
  if (wrong.value) {
    for (const id of q.pushed) t[id] = 'pick';
    for (const id of chosen.value) if (!q.pushed.includes(id)) t[id] = 'miss';
  } else for (const id of chosen.value) t[id] = 'pick';
  return t;
});
const labels = computed(() => {
  const l: Record<number, number> = {};
  props.view.visited.forEach((v, id) => {
    if (v) l[id] = props.view.dist[id];
  });
  return l;
});

function toggle(id: number) {
  if (!props.pickable || id === props.view.cur) return;
  const s = new Set(sel.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  sel.value = s;
}
</script>

<template>
  <Maze :maze="maze" :tones="tones" :labels="labels" :mouse="maze.start" coords :clickable="pickable" :t="t" @pick="toggle" />
  <QueueRow :maze="maze" :queue="view.queue" :dist="view.dist" :t="t" />
  <div v-if="pickable" class="answers">
    <button type="button" class="btn small primary" @click="emit('act', predictKey(sel))">{{ t(m('predict.done', { n: sel.size })) }}</button>
    <button type="button" class="btn small" @click="emit('act', 'end')">{{ t(m('predict.end')) }}</button>
  </div>
</template>
