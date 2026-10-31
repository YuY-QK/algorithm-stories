<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import { FLASH_MS, SHAKE_MS } from '../../../../core/timing';
import type { Msg } from '../../../../core/types';
import type { Tone } from '../../../../engine/dfs';
import { useStageStop } from '../../shared/usePlayer';

// 方格地图：看、玩、做共用，只负责画，不管规则。
// 每个格子可以有一个色调（tones）、一个 emoji（emojis）和一个小字（labels，通常是访问的先后）。
// 山洞里的岩石是 walls；海图没有岩石，海和陆地靠 tones 的 sea / land / i0～i3 区分。
const props = withDefaults(defineProps<{
  w: number;
  h: number;
  walls?: boolean[];
  tones?: Record<number, Tone>;
  labels?: Record<number, string | number>;
  emojis?: Record<number, string>;
  clickable?: boolean;
  /** 透光提示的格子；glowKey 每变一次就重新闪一遍 */
  glow?: number[];
  glowKey?: number;
  /** 每变一次就让这个格子摇一下头，格式 [格子, 计数] */
  shake?: [number, number] | null;
  /** 在上方和左边标出列号、行号 */
  coords?: boolean;
  t: (msg: Msg) => string;
}>(), {
  walls: () => [], tones: () => ({}), labels: () => ({}), emojis: () => ({}), clickable: false,
  glow: () => [], glowKey: 0, shake: null, coords: false,
});

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

const ids = computed(() => Array.from({ length: props.w * props.h }, (_, k) => k));

const TONE_NAME: Partial<Record<Tone, Msg>> = {
  crumb: m('grid.tone.crumb'), path: m('grid.tone.path'), cur: m('grid.tone.cur'), nb: m('grid.tone.nb'), best: m('grid.tone.best'),
  pick: m('grid.tone.pick'), sea: m('grid.tone.sea'), land: m('grid.tone.land'), i0: m('grid.tone.i0'), i1: m('grid.tone.i1'),
  i2: m('grid.tone.i2'), i3: m('grid.tone.i3'),
};
const EMOJI_NAME: Record<string, Msg> = {
  '🧭': m('grid.hero'), '💎': m('grid.treasure'), '🍞': m('grid.crumbEmoji'), '🏝️': m('grid.island'),
};

function label(id: number): string {
  const parts = [props.t(m('grid.cell', { r: Math.floor(id / props.w), c: id % props.w }))];
  if (props.walls[id]) parts.push(props.t(m('grid.rock')));
  const e = props.emojis[id];
  if (e) parts.push(EMOJI_NAME[e] ? props.t(EMOJI_NAME[e]) : e);
  const tone = props.tones[id];
  if (tone && TONE_NAME[tone]) parts.push(props.t(TONE_NAME[tone]!));
  if (props.labels[id] !== undefined) parts.push(props.t(m('grid.nth', { n: props.labels[id] })));
  return parts.join('，');
}
</script>

<template>
  <div class="gd" :class="{ coords }" :style="{ '--w': w + (coords ? 1 : 0) }">
    <template v-if="coords">
      <span class="ax" aria-hidden="true" />
      <span v-for="c in w" :key="'c' + c" class="ax" aria-hidden="true">{{ c - 1 }}</span>
    </template>
    <template v-for="id in ids" :key="id">
      <span v-if="coords && id % w === 0" class="ax" aria-hidden="true">{{ Math.floor(id / w) }}</span>
      <button
        type="button"
        class="sq"
        :class="[
          tones[id],
          {
            wall: walls[id],
            glow: glowing.has(id),
            shake: shaking === id,
            both: !!emojis[id] && labels[id] !== undefined,
            crumbs: emojis[id] === '🍞',
          },
        ]"
        :disabled="!clickable"
        :aria-label="label(id)"
        @click="emit('pick', id)"
      >
        <span v-if="emojis[id]" class="emo">{{ emojis[id] }}</span>
        <span v-if="labels[id] !== undefined" class="lab">{{ labels[id] }}</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.gd {
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
.emo { font-size: clamp(14px, 5vw, 26px); line-height: 1; white-space: nowrap; }
.crumbs .emo { font-size: clamp(10px, 3.4vw, 18px); opacity: 0.85; }
.lab { font: 600 clamp(10px, 3vw, 15px) var(--mono); font-variant-numeric: tabular-nums; line-height: 1; }
.both .lab { position: absolute; right: 2px; bottom: 1px; font-size: clamp(8px, 2.2vw, 11px); }
.both .emo { font-size: clamp(12px, 4vw, 22px); }

/* 有面包屑、但已经不在现在这条路上（走过又退回来的格子） */
.sq.crumb { background: color-mix(in srgb, var(--accent) 20%, var(--surface)); border-color: color-mix(in srgb, var(--accent) 40%, var(--surface)); }
/* 现在这条路（栈里的格子） */
.sq.path { background: color-mix(in srgb, var(--mid) 45%, var(--surface)); border-color: var(--mid); }
.sq.cur { background: var(--mid); border-color: var(--mid); color: var(--mid-ink); }
.sq.nb { box-shadow: inset 0 0 0 3px var(--fg); }
.sq.best, .sq.pick { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.sq.miss { border-color: var(--warn); box-shadow: inset 0 0 0 2px var(--warn); }
.sq.dim { opacity: 0.45; }

/* 海图：海是浅浅的一片，陆地是实心的，每座岛一种颜色 */
.sq.sea { background: color-mix(in srgb, var(--accent) 7%, var(--surface)); border-color: color-mix(in srgb, var(--accent) 16%, var(--surface)); }
.sq.land { background: color-mix(in srgb, var(--fg) 24%, var(--surface)); border-color: color-mix(in srgb, var(--fg) 40%, var(--surface)); }
.sq.i0 { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.sq.i1 { background: var(--mid); border-color: var(--mid); color: var(--mid-ink); }
.sq.i2 { background: var(--warn); border-color: var(--warn); color: var(--surface); }
.sq.i3 { background: var(--fg); border-color: var(--fg); color: var(--surface); }

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
