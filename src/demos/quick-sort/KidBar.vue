<script setup lang="ts">
import type { Kind } from '../../engine/quick-sort';
import { animalOf } from './animals';

// 一位同学：小动物站在一根柱子上，柱子高度就是身高，下面写着数字。
// 看和玩共用，只负责画。颜色由 kind 决定：矮队、高队、标杆、已站定、暗掉。
withDefaults(defineProps<{
  id: number;
  v: number;
  /** 最高的身高，柱子按它换算高度 */
  max: number;
  kind?: Kind;
  /** 头上插着标杆旗 */
  flag?: boolean;
  /** 正在被比较 */
  cmp?: boolean;
  /** 头上的小提示，比如 👆 */
  mark?: string;
  shake?: boolean;
  glow?: boolean;
}>(), { kind: 'plain', flag: false, cmp: false, mark: '', shake: false, glow: false });
</script>

<template>
  <div class="kid" :class="[kind, { cmp, shake, glow }]">
    <span class="top" aria-hidden="true">{{ flag ? '🚩' : mark }}</span>
    <span class="face" aria-hidden="true">{{ animalOf(id) }}</span>
    <span class="bar" :style="{ height: 'calc(var(--bar) * ' + v / max + ')' }" />
    <span class="h">{{ v }}</span>
  </div>
</template>

<style scoped>
.kid { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; width: 100%; min-width: 0; }
.top { height: 20px; font-size: 16px; line-height: 20px; }
.face { font-size: clamp(20px, 6vw, 30px); line-height: 1.1; transition: transform 0.25s; }
.bar {
  width: 78%; max-width: 40px; box-sizing: border-box; border: 1.5px solid color-mix(in srgb, var(--fg) 40%, var(--bg)); border-bottom: 0;
  border-radius: 6px 6px 0 0; background: color-mix(in srgb, var(--fg) 14%, var(--bg)); transition: background 0.3s, border-color 0.3s;
}
.h { height: 22px; font: 700 14px/22px var(--mono); font-variant-numeric: tabular-nums; color: var(--fg); }
.kid.low .bar { background: color-mix(in srgb, var(--accent) 40%, var(--bg)); border-color: var(--accent); }
.kid.high .bar { background: color-mix(in srgb, var(--mid) 55%, var(--bg)); border-color: var(--mid); }
.kid.pivot .bar { background: var(--warn); border-color: var(--warn); }
.kid.pivot .h { color: var(--warn); }
.kid.placed .bar { background: var(--accent); border-color: var(--accent); }
.kid.placed .h { color: var(--accent); }
.kid.dim { opacity: 0.38; }
.kid.cmp .face { transform: translateY(-6px); }
.kid.cmp .h { text-decoration: underline; }
.kid.shake { animation: shake 0.5s ease-in-out; }
.kid.glow .bar { animation: glow 0.9s ease-in-out 2; }
@keyframes shake {
  20%, 60% { transform: translateX(-5px) rotate(-4deg); }
  40%, 80% { transform: translateX(5px) rotate(4deg); }
}
@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 16px 5px var(--mid); }
}
@media (prefers-reduced-motion: reduce) {
  .kid.shake, .kid.glow .bar { animation: none; }
  .kid.glow .bar { box-shadow: 0 0 0 3px var(--mid); }
  .bar, .face { transition: none; }
}
</style>
