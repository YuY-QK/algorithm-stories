<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { SHAKE_MS } from '../../../../core/timing';
import { useStageStop } from '../../shared/usePlayer';
import { memoCalls, naiveCalls, notesLookups, notesRoot, ways, type NotesAction, type NotesGame } from '../../../../engine/dynamic-programming';
import CallTree from './CallTree.vue';

// 玩法二「便签有多省事」的画面：递归调用树。点圆圈 emit 一个 pick 操作，规则判断是不是「前面已经算过」。
// 全找出来以后是两条进度条，比较两种算法要算几次。摇头和闪光的次数在状态里，这里负责让它们动一下。
const props = defineProps<{ state: NotesGame; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: NotesAction] }>();

const root = () => notesRoot(props.state);
const naive = () => naiveCalls(props.state.n);
const memo = () => memoCalls(props.state.n);
const bar = (v: number) => Math.max(2, (v / naive()) * 100) + '%';

const shakeId = ref<number | null>(null);
const glowing = ref<number[]>([]);
let timer: ReturnType<typeof setTimeout> | null = null;
function stop() {
  if (timer) clearTimeout(timer);
  timer = null;
  shakeId.value = null;
}
watch(() => props.state.shake, (v) => {
  stop();
  if (!v) return;
  requestAnimationFrame(() => (shakeId.value = v[0]));
  timer = setTimeout(() => (shakeId.value = null), SHAKE_MS);
});
// 每次闪光，先灭再亮，让它重新闪一遍
watch(() => props.state.glowN, () => {
  glowing.value = [];
  requestAnimationFrame(() => (glowing.value = props.state.glow));
});
watch(() => props.state.glow, (g) => {
  if (!g.length) glowing.value = [];
});
useStageStop(stop);
onBeforeUnmount(stop);
</script>

<template>
  <div class="treewrap" :style="{ '--w': 'min(34px, calc((100vw - 56px) / ' + ways(state.n) + '))' }">
    <CallTree
      :node="root()" :found="state.found" :reveal="state.phase === 'explore'" :glow="glowing" :shake-id="shakeId"
      :clickable="clickable" :t="t" @pick="(node) => emit('act', { type: 'pick', id: node.id })"
    />
  </div>

  <p v-if="state.phase === 'tap'" class="status" aria-live="polite">{{ t(m('scene.notes.status', { a: state.found.length, b: notesLookups(state).length })) }}</p>

  <div v-else class="meter">
    <div class="mrow">
      <span class="who">{{ t(m('scene.notes.naive')) }}</span>
      <div class="track"><div class="fill muted" :style="{ width: '100%' }" /></div>
      <span class="mn">{{ t(m('scene.notes.times', { n: naive() })) }}</span>
    </div>
    <div class="mrow">
      <span class="who">{{ t(m('scene.notes.memo')) }}</span>
      <div class="track"><div class="fill accent" :style="{ width: bar(memo()) }" /></div>
      <span class="mn">{{ t(m('scene.notes.times', { n: memo() })) }}</span>
    </div>
  </div>
</template>

<style scoped>
.treewrap { overflow-x: auto; padding: 4px 0 8px; display: flex; justify-content: center; }
.meter { display: flex; flex-direction: column; gap: 8px; max-width: 520px; }
.mrow { display: grid; grid-template-columns: 6.5em minmax(0, 1fr) 4.6em; gap: 8px; align-items: center; }
.who { font-size: 14px; }
.mn { font: 600 14px var(--mono); text-align: right; font-variant-numeric: tabular-nums; }
</style>
