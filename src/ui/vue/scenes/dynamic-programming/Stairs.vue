<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';

// 楼梯：第 0 级是地面，往上每一级贴一张便签。看、玩法一共用，只负责画，不管规则。
const props = withDefaults(defineProps<{
  /** 最高一级 */
  n: number;
  /** 小兔子站在第几级 */
  bunny?: number | null;
  /** 每一级便签上的数字，null 是还没写 */
  notes: (number | null)[];
  /** 高亮：这一级的答案是从这几级来的 */
  from?: number[];
  /** 透光提示 */
  glow?: number[];
  /** 正在回答的那一级，便签上显示 ❓ */
  ask?: number | null;
  /** 终点旗子 */
  goal?: number | null;
  t: (msg: Msg) => string;
}>(), { bunny: null, from: () => [], glow: () => [], ask: null, goal: null });

function label(i: number, v: number | null): string {
  return props.t(m('scene.stairs.label', {
    where: i === 0 ? m('scene.stairs.ground') : m('scene.stairs.level', { i }),
    note: v === null ? m('scene.stairs.empty') : m('scene.stairs.note', { v }),
  }));
}
</script>

<template>
  <div class="stairs" :style="{ '--cols': n + 1 }" role="img" :aria-label="t(m('scene.stairs', { n }))">
    <div v-for="(_, i) in n + 1" :key="i" class="col" :class="{ from: from.includes(i), glow: glow.includes(i) }">
      <div class="top" aria-hidden="true">
        <span v-if="goal === i && bunny !== i" class="flag">🚩</span>
        <span v-if="bunny === i" :key="'b' + i" class="bunny">🐰</span>
      </div>
      <div class="step-block" :style="{ '--h': i }" :aria-label="label(i, notes[i] ?? null)">
        <span class="sticky" :class="{ empty: notes[i] === null, ask: ask === i }">{{ notes[i] ?? (ask === i ? '❓' : '') }}</span>
        <span class="lv">{{ i === 0 ? t(m('scene.stairs.ground')) : i }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stairs { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 3px; align-items: end; max-width: 560px; width: 100%; }
.col { display: flex; flex-direction: column; align-items: stretch; min-width: 0; border-radius: 8px; }
.top { height: clamp(30px, 8vw, 40px); display: flex; align-items: flex-end; justify-content: center; font-size: clamp(20px, 6vw, 30px); line-height: 1; }
.flag { font-size: 0.8em; }
.bunny { display: inline-block; animation: hop 0.5s ease-out; }
.step-block {
  height: calc(46px + var(--h) * clamp(12px, 3.4vw, 20px));
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: 6px 2px 4px;
  background: var(--surface); border: 1.5px solid var(--line); border-radius: 8px 8px 2px 2px;
  transition: border-color 0.3s, background 0.3s;
}
.sticky {
  min-width: 0; width: 88%; height: clamp(24px, 6.5vw, 32px); display: grid; place-items: center;
  font: 700 clamp(12px, 3.6vw, 17px) var(--mono); font-variant-numeric: tabular-nums;
  background: var(--mid); color: var(--mid-ink); border-radius: 3px; transform: rotate(-3deg);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--fg) 18%, transparent);
}
.sticky.empty { background: transparent; border: 1.5px dashed var(--line); box-shadow: none; transform: none; color: var(--muted); }
.sticky.ask { border-color: var(--accent); }
.lv { font: 500 clamp(9px, 2.6vw, 12px) var(--mono); color: var(--muted); }
.col.from .step-block { border-color: var(--accent); background: var(--out); }
.col.glow .step-block { animation: glow 0.9s ease-in-out 3; }

@keyframes hop {
  0% { transform: translateY(0); }
  40% { transform: translateY(-14px); }
  100% { transform: translateY(0); }
}
@keyframes glow {
  50% { box-shadow: 0 0 0 4px var(--mid), 0 0 16px 4px var(--mid); }
}
@media (prefers-reduced-motion: reduce) {
  .bunny { animation: none; }
  .col.glow .step-block { animation: none; box-shadow: 0 0 0 3px var(--mid); }
}
</style>
