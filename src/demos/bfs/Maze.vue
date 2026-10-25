<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { colOf, isWall, rowOf, type Maze } from '../../engine/bfs';
import { useStageStop } from '../../components/shared/usePlayer';
import { FLASH_MS, SHAKE_MS } from '../../components/shared/timing';

// 迷宫：看、玩、做共用，只负责画，不管规则。
// 每个格子可以有一个色调（tones）和一个小字（labels，通常是离起点几步）。
export type Tone = 'old' | 'ring' | 'path' | 'mine' | 'queued' | 'cur' | 'nb' | 'pick' | 'best' | 'miss';

const props = withDefaults(defineProps<{
  maze: Maze;
  tones?: Record<number, Tone>;
  labels?: Record<number, string | number>;
  /** 小老鼠站在哪一格，null 表示不画 */
  mouse?: number | null;
  clickable?: boolean;
  /** 透光提示的格子；glowKey 每变一次就重新闪一遍 */
  glow?: number[];
  glowKey?: number;
  /** 每变一次就让这个格子摇一下头，格式 [格子, 计数] */
  shake?: [number, number] | null;
  /** 在上方和左边标出列号、行号 */
  coords?: boolean;
}>(), { tones: () => ({}), labels: () => ({}), mouse: null, clickable: false, glow: () => [], glowKey: 0, shake: null, coords: false });

const emit = defineEmits<{ pick: [id: number] }>();

const shaking = ref<number | null>(null);
const glowing = ref<Set<number>>(new Set());
let shakeTimer: ReturnType<typeof setTimeout> | null = null;
let glowTimer: ReturnType<typeof setTimeout> | null = null;
function stopShake() {
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = null;
  shaking.value = null;
}
function stopGlow() {
  if (glowTimer) clearTimeout(glowTimer);
  glowTimer = null;
  glowing.value = new Set();
}
watch(() => props.shake, (v) => {
  if (!v) return;
  stopShake();
  requestAnimationFrame(() => (shaking.value = v[0]));
  shakeTimer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});
watch(() => props.glowKey, () => {
  stopGlow();
  requestAnimationFrame(() => (glowing.value = new Set(props.glow)));
  glowTimer = setTimeout(() => (glowing.value = new Set()), FLASH_MS);
});
// 切换标签或卸载时，晃动和透光动画停下
useStageStop(() => {
  stopShake();
  stopGlow();
});
onBeforeUnmount(() => {
  stopShake();
  stopGlow();
});

const ids = computed(() => Array.from({ length: props.maze.w * props.maze.h }, (_, k) => k));

function emoji(id: number): string {
  if (props.mouse === id) return id === props.maze.end ? '🐭🧀' : '🐭';
  if (id === props.maze.end) return '🧀';
  return '';
}

const TONE_NAME: Partial<Record<Tone, string>> = {
  old: '已走到', ring: '这一圈', path: '最短路', mine: '你的路', queued: '在队列里', cur: '正在处理', nb: '正在看', pick: '你选的', best: '最短路',
};

function label(id: number): string {
  const r = rowOf(props.maze, id);
  const c = colOf(props.maze, id);
  const parts = [r + ' 行 ' + c + ' 列'];
  if (isWall(props.maze, id)) parts.push('墙');
  if (id === props.maze.start) parts.push('起点');
  if (id === props.maze.end) parts.push('奶酪');
  if (props.mouse === id) parts.push('小老鼠在这里');
  const t = props.tones[id];
  if (t && TONE_NAME[t]) parts.push(TONE_NAME[t]!);
  if (props.labels[id] !== undefined) parts.push(String(props.labels[id]));
  return parts.join('，');
}
</script>

<template>
  <div class="mz" :class="{ coords }" :style="{ '--w': maze.w + (coords ? 1 : 0) }">
    <template v-if="coords">
      <span class="ax" aria-hidden="true" />
      <span v-for="c in maze.w" :key="'c' + c" class="ax" aria-hidden="true">{{ c - 1 }}</span>
    </template>
    <template v-for="id in ids" :key="id">
      <span v-if="coords && colOf(maze, id) === 0" class="ax" aria-hidden="true">{{ rowOf(maze, id) }}</span>
      <button
        type="button"
        class="sq"
        :class="[
          tones[id],
          {
            wall: isWall(maze, id),
            glow: glowing.has(id),
            shake: shaking === id,
            both: !!emoji(id) && labels[id] !== undefined,
          },
        ]"
        :disabled="!clickable"
        :aria-label="label(id)"
        @click="emit('pick', id)"
      >
        <span v-if="emoji(id)" class="emo">{{ emoji(id) }}</span>
        <span v-if="labels[id] !== undefined" class="lab">{{ labels[id] }}</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.mz {
  display: grid; grid-template-columns: repeat(var(--w), minmax(0, 1fr));
  gap: clamp(2px, 0.6vw, 4px); width: 100%; max-width: 440px;
}
.ax { display: grid; place-items: center; font: 400 10px var(--mono); color: var(--muted); min-width: 0; }
.sq {
  font: inherit; padding: 0; min-width: 0; aspect-ratio: 1; position: relative; cursor: pointer;
  display: grid; place-items: center; overflow: hidden;
  border-radius: 6px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
  transition: background 0.35s, border-color 0.35s, transform 0.2s;
}
.sq:disabled { cursor: default; }
.sq:not(:disabled):hover { border-color: var(--accent); }
.sq:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; z-index: 1; }
.sq.wall { background: var(--muted); border-color: var(--muted); }
.emo { font-size: clamp(14px, 5vw, 26px); line-height: 1; white-space: nowrap; letter-spacing: -0.2em; }
.lab { font: 600 clamp(10px, 3vw, 15px) var(--mono); font-variant-numeric: tabular-nums; line-height: 1; }
.both .lab { position: absolute; right: 2px; bottom: 1px; font-size: clamp(8px, 2.2vw, 11px); }
.both .emo { font-size: clamp(12px, 4vw, 22px); }

.sq.old { background: color-mix(in srgb, var(--accent) 22%, var(--surface)); border-color: color-mix(in srgb, var(--accent) 40%, var(--surface)); }
.sq.ring, .sq.cur { background: var(--mid); border-color: var(--mid); color: var(--mid-ink); }
.sq.path, .sq.best { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.sq.mine { background: color-mix(in srgb, var(--mid) 55%, var(--surface)); border-color: var(--mid); }
.sq.queued { border: 2px dashed var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--surface)); }
.sq.nb { box-shadow: inset 0 0 0 3px var(--fg); }
.sq.pick { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.sq.miss { border-color: var(--warn); box-shadow: inset 0 0 0 2px var(--warn); }

.sq.glow { animation: glow 0.9s ease-in-out 2; }
.sq.shake { animation: shake 0.5s ease-in-out; }
@keyframes glow {
  50% { box-shadow: 0 0 0 3px var(--mid), 0 0 14px 4px var(--mid); transform: scale(1.08); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-3px) rotate(-6deg); }
  40%, 80% { transform: translateX(3px) rotate(6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .sq.glow, .sq.shake { animation: none; box-shadow: 0 0 0 3px var(--mid); }
}
</style>
