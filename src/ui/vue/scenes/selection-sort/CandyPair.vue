<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { CANDY_MAX } from '../../../../engine/selection-sort';
import { useStageStop } from '../../shared/usePlayer';
import { SHAKE_MS } from '../../../../core/timing';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';

// 把两颗糖果并排放大、站在同一条线上，比一比哪颗小。玩法一、二共用。
const props = withDefaults(defineProps<{
  left: number;
  right: number;
  /** 两颗糖果上方的小标签（emoji） */
  leftTag?: string;
  rightTag?: string;
  /** 透光提示哪一边：[边, 第几次]，次数变了才重新亮一次 */
  glow?: ['l' | 'r', number] | null;
  clickable?: boolean;
  /** 每次变化就让这一边摇一下，格式 [边, 计数] */
  shake?: ['l' | 'r', number] | null;
  t: (msg: Msg) => string;
}>(), { leftTag: '', rightTag: '', glow: null, clickable: false, shake: null });

const emit = defineEmits<{ pick: [side: 'l' | 'r'] }>();

const shaking = ref<'l' | 'r' | null>(null);
const glowing = ref<'l' | 'r' | null>(null);
let shakeTimer: ReturnType<typeof setTimeout> | null = null;
function stopShake() {
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = null;
  shaking.value = null;
}
watch(() => props.shake, (v) => {
  if (!v) return;
  stopShake();
  requestAnimationFrame(() => (shaking.value = v[0]));
  shakeTimer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});
watch(() => props.glow, (v) => {
  glowing.value = null;
  if (v) requestAnimationFrame(() => (glowing.value = v[0]));
});
// 切换标签或卸载时，晃动动画停下
useStageStop(stopShake);
onBeforeUnmount(stopShake);

const scale = (v: number) => (0.42 + (0.58 * v) / CANDY_MAX).toFixed(3);
const hue = (v: number) => 'hue-rotate(' + ((v * 47) % 360) + 'deg)';
</script>

<template>
  <div class="pair">
    <button
      v-for="side in (['l', 'r'] as const)"
      :key="side"
      type="button"
      class="side"
      :class="{ glow: glowing === side, shake: shaking === side }"
      :disabled="!clickable"
      :aria-label="t(m('scene.pair', { v: side === 'l' ? left : right }))"
      @click="emit('pick', side)"
    >
      <span class="tagline" aria-hidden="true">{{ side === 'l' ? leftTag : rightTag }}</span>
      <span class="candy" :style="{ '--s': scale(side === 'l' ? left : right), filter: hue(side === 'l' ? left : right) }">🍬</span>
      <span class="size">{{ side === 'l' ? left : right }}</span>
    </button>
  </div>
</template>

<style scoped>
.pair { display: flex; gap: 14px; align-items: stretch; --u: clamp(64px, 22vw, 104px); }
.side {
  font: inherit; color: var(--fg); cursor: pointer; padding: 6px 10px 8px; min-width: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px;
  width: calc(var(--u) * 1.35); height: calc(var(--u) * 1.3 + 48px);
  border-radius: 16px; border: 1.5px solid var(--line); background: var(--surface);
  border-bottom: 4px solid var(--line);
}
.side:disabled { cursor: default; }
.side:not(:disabled):hover { border-color: var(--accent); }
.side:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.tagline { font-size: 1.3rem; line-height: 1.2; margin-bottom: auto; }
.candy { font-size: calc(var(--u) * var(--s)); line-height: 1; }
.size { font: 600 14px var(--mono); color: var(--muted); }
.side.glow { animation: glow 0.9s ease-in-out 2; }
.side.shake { animation: shake 0.5s ease-in-out; }
@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 18px 6px var(--mid); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-4deg); }
  40%, 80% { transform: translateX(4px) rotate(4deg); }
}
@media (prefers-reduced-motion: reduce) {
  .side.glow, .side.shake { animation: none; box-shadow: 0 0 0 3px var(--mid); }
}
</style>
